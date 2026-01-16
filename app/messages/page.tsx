'use client';

import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageInput } from '@/components/message-input';
import { MessageBubble } from '@/components/message-bubble';
import { EmptyMessages } from '@/components/empty-messages';
import { getMessagingState, createMessage, hasMessages, shouldAddSystemMessage, createSystemMessage } from '@/lib/messaging-utils';
import { canTransitionToStatus } from '@/lib/job-lifecycle';
import { AppLayout } from '@/components/app-nav';
import { callTradeHubAI } from '@/lib/ai-client';
import { EmptyState } from '@/components/empty-state';

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = getStore();

  const conversationId = searchParams.get('conversation');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    setSendError(undefined);
    if (selectedConversation && currentUser) {
      store.markConversationAsRead(selectedConversation, currentUser.id);
    }
  }, [selectedConversation, currentUser, store]);

  // Calculate derived values before early return
  const conversations = currentUser
    ? store.conversations.filter(
        (c) => c.contractorId === currentUser.id || c.subcontractorId === currentUser.id
      )
    : [];

  const currentConversation = selectedConversation
    ? store.getConversationById(selectedConversation)
    : null;

  const currentJob = currentConversation ? store.getJobById(currentConversation.jobId) : null;

  const otherUserId =
    currentConversation?.contractorId === currentUser?.id
      ? currentConversation?.subcontractorId
      : currentConversation?.contractorId;

  const otherUser = otherUserId ? store.getUserById(otherUserId) : null;

  const messages = currentConversation
    ? store.getMessagesByConversation(currentConversation.id)
    : [];

  // All hooks must be called before any early returns
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (!currentUser) {
    return null;
  }

  const messagingState = getMessagingState(currentJob || null, currentUser);

  const parse3Suggestions = (text: string): string[] => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const numbered = lines
      .map(l => l.replace(/^\d+[\).\-\:]\s*/, '').trim())
      .filter(Boolean);

    const out = Array.from(new Set(numbered)).slice(0, 3);

    if (out.length < 3) {
      const blocks = text
        .split(/\n\s*\n/)
        .map(b => b.trim())
        .filter(Boolean);
      return Array.from(new Set([...out, ...blocks])).slice(0, 3);
    }

    return out;
  };

  const handleSuggestReply = async () => {
    setSuggestError(null);
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      if (!currentUser?.id || !currentConversation) {
        setSuggestError('Please select a conversation');
        return;
      }

      const last8 = messages.slice(-8).map((m) => ({
        role: m.senderId === currentUser.id ? 'user' as const : 'assistant' as const,
        content: m.text ?? '',
      }));

      const message = await callTradeHubAI({
        userId: currentUser.id,
        mode: 'reply_suggest',
        messages: [
          { role: 'user', content: 'Suggest my next reply. Return 3 options: Friendly, Firm, Very brief.' },
          ...last8,
        ],
        context: {
          role: currentUser.role,
          conversationId: currentConversation.id,
          jobId: currentJob?.id ?? null,
          jobTitle: currentJob?.title ?? null,
        },
      });

      setSuggestions(parse3Suggestions(message.content));
    } catch (e: any) {
      setSuggestError(e?.message || 'AI suggestion failed');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setMessageText(suggestion);
    setSuggestions([]);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation || !currentUser) return;

    setSendError(undefined);
    setIsSending(true);

    try {
      const result = createMessage(currentConversation.id, currentUser.id, messageText);

      if (!result.success || !result.message) {
        setSendError(result.error || 'Failed to send message');
        setIsSending(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      store.addMessage(result.message);
      setMessageText('');
      setSendError(undefined);
    } catch (error) {
      setSendError('Network error. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const addSystemMessageIfNeeded = (jobId: string, newStatus: string) => {
    if (!currentConversation) return;

    const messages = store.getMessagesByConversation(currentConversation.id);
    if (shouldAddSystemMessage(messages, newStatus as any)) {
      const systemMsg = createSystemMessage(
        currentConversation.id,
        newStatus as any,
        currentJob?.cancellationReason
      );
      store.addMessage(systemMsg);
    }
  };

  const handleAcceptJob = () => {
    if (!currentJob || !currentConversation) return;

    const transition = canTransitionToStatus('accepted', 'confirmed');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(currentJob.id, { status: 'confirmed' });
    addSystemMessageIfNeeded(currentJob.id, 'accepted');

    const myApp = store.getApplicationsByJob(currentJob.id).find(
      (a) => a.subcontractorId === currentUser?.id
    );
    if (myApp) {
      store.updateApplication(myApp.id, { status: 'accepted', respondedAt: new Date() });
    }

    router.refresh();
  };

  const handleDeclineJob = () => {
    if (!currentJob || !currentConversation) return;

    const transition = canTransitionToStatus('accepted', 'open');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(currentJob.id, { status: 'open', selectedSubcontractor: undefined });

    const myApp = store.getApplicationsByJob(currentJob.id).find(
      (a) => a.subcontractorId === currentUser?.id
    );
    if (myApp) {
      store.updateApplication(myApp.id, { status: 'declined', respondedAt: new Date() });
    }

    router.refresh();
  };

  const handleConfirmHire = () => {
    if (!currentJob || !currentConversation) return;

    const transition = canTransitionToStatus('accepted', 'confirmed', {
      hasSelectedSubcontractor: !!currentJob.selectedSubcontractor,
    });
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(currentJob.id, {
      status: 'confirmed',
      confirmedSubcontractor: currentJob.selectedSubcontractor,
    });
    addSystemMessageIfNeeded(currentJob.id, 'confirmed');

    const selectedApp = store.getApplicationsByJob(currentJob.id).find(
      (a) => a.subcontractorId === currentJob.selectedSubcontractor
    );
    if (selectedApp) {
      store.updateApplication(selectedApp.id, { status: 'confirmed' });
    }

    router.refresh();
  };

  const isContractor = currentUser.role === 'contractor';
  const showEmptyState = messages.length === 0 || !hasMessages(messages);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50 min-w-0 overflow-hidden">
        <div className="hidden md:flex md:w-80 border-r border-gray-200 bg-white flex-col min-w-0 flex-shrink-0">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-2 min-w-0">
              {conversations.length === 0 && (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Messages appear once you apply for a job or a contractor contacts you."
                  ctaLabel="Browse jobs"
                  onCtaClick={() => router.push('/tenders')}
                />
              )}
              {conversations.map((conv) => {
                const job = store.getJobById(conv.jobId);
                const userId = conv.contractorId === currentUser.id ? conv.subcontractorId : conv.contractorId;
                const user = store.getUserById(userId);

                if (!job || !user) return null;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                      selectedConversation === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <UserAvatar avatarUrl={user.avatar} userName={user.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-600 truncate">{job.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center min-w-0">
              <div className="text-center px-4 max-w-md">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">Select a conversation</h3>
                <p className="text-gray-600 break-words">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                 <UserAvatar
  avatarUrl={otherUser?.avatar ?? undefined}
  userName={otherUser?.name || ''}
  size="md"
  className="flex-shrink-0"
/>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate break-words">{otherUser?.name}</p>
                    <p className="text-sm text-gray-600 truncate break-words">{currentJob?.title}</p>
                  </div>
                  {currentJob && (
                    <Link href={`/jobs/${currentJob.id}`} className="flex-shrink-0">
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm whitespace-nowrap">
                        View Job
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-w-0">
                {showEmptyState ? (
                  <EmptyMessages otherUserName={otherUser?.name} />
                ) : (
                  <div className="p-3 sm:p-4 space-y-4 min-w-0">
                    {currentJob && currentJob.status === 'accepted' && !isContractor && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">You've been selected for this job!</h4>
                        <p className="text-sm text-blue-800 mb-4">
                          The contractor has selected you for "{currentJob.title}". Accept to proceed.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={handleAcceptJob} size="sm">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button onClick={handleDeclineJob} variant="outline" size="sm">
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentJob && currentJob.status === 'accepted' && isContractor && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Subcontractor Accepted!</h4>
                        <p className="text-sm text-green-800 mb-4">
                          {otherUser?.name} has accepted the job. Confirm to finalize the hire.
                        </p>
                        <Button onClick={handleConfirmHire} size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Hire
                        </Button>
                      </div>
                    )}

                    {currentJob && currentJob.status === 'confirmed' && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-1">Job Confirmed!</h4>
                        <p className="text-sm text-green-800">
                          This job has been confirmed and is ready to start.
                        </p>
                      </div>
                    )}

                    {messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <MessageBubble key={msg.id} message={msg} isMe={isMe} />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <MessageInput
                messagingState={messagingState}
                messageText={messageText}
                onMessageChange={setMessageText}
                onSendMessage={handleSendMessage}
                isSending={isSending}
                error={sendError}
                onSuggestReply={handleSuggestReply}
                suggestLoading={suggestLoading}
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
                aiError={suggestError}
              />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
