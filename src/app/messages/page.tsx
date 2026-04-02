'use client';

/*
 * QA notes — ABN gating (Messages):
 * - /messages list and thread reading work for unverified users.
 * - Plain sending messages remains allowed for unverified.
 * - Commitment action cards (Accept/Decline, Confirm hire, Award job, etc.) are blocked for unverified:
 *   disabled button + "Verify ABN to continue" + CTA link to /verify-business. Verified users use action cards normally.
 */

import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { MessageSquare, CheckCircle, XCircle, MoreVertical, User, Ban, Flag, ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MessageInput } from '@/components/message-input';
import { MessageBubble } from '@/components/message-bubble';
import { EmptyMessages } from '@/components/empty-messages';
import { getMessagingState, validateMessage, hasMessages, shouldAddSystemMessage, createSystemMessage } from '@/lib/messaging-utils';
import { canTransitionToStatus } from '@/lib/job-lifecycle';
import { AppLayout } from '@/components/app-nav';
import { callTradeHubAI } from '@/lib/ai-client';
import { EmptyState } from '@/components/empty-state';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { safeRouterPush } from '@/lib/safe-nav';
import { buildLoginUrl, getPublicProfileHref } from '@/lib/url-utils';
import { debugProfileCardData } from '@/lib/profile-debug';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
export default function MessagesPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const searchParams = useSearchParams();
  const store = getStore();

  const conversationId = searchParams.get('conversation');
  const userIdParam = searchParams.get('userId');
  const jobIdParam = searchParams.get('job');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversationsFromApi, setConversationsFromApi] = useState<Array<{
    id: string;
    contractorId: string;
    subcontractorId: string;
    jobId: string | null;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar: string | null;
    lastMessage: { id: string; senderId: string; text: string; isSystemMessage: boolean; createdAt: string } | null;
    jobTitle: string | null;
    jobStatus: string | null;
    updatedAt: string;
    unreadCount?: number;
  }>>([]);
  const [messagesFromApi, setMessagesFromApi] = useState<Array<{
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    isSystemMessage: boolean;
    createdAt: string;
  }>>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [jobFromApi, setJobFromApi] = useState<{
    id: string;
    contractorId: string;
    title: string;
    status: string;
    selectedSubcontractor: string | null;
    confirmedSubcontractor: string | null;
    cancellationReason: string | null;
    applications: Array<{ id: string; subcontractorId: string; status: string }>;
  } | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [, setBlocksUpdated] = useState(0);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<string>('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportAlsoBlock, setReportAlsoBlock] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [conversationFromMessagesApi, setConversationFromMessagesApi] = useState<{
    id: string;
    contractorId: string;
    subcontractorId: string;
    jobId: string | null;
    otherUserId?: string;
    otherUserName?: string;
    otherUserAvatar?: string | null;
  } | null>(null);

  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [conversationId]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;
    if (!currentUser) {
      hasRedirected.current = true;
      safeRouterPush(router, buildLoginUrl('/messages'), buildLoginUrl('/messages'));
    }
  }, [isLoading, currentUser, router]);

  // Load conversations from Supabase when user is present
  useEffect(() => {
    if (!currentUser) return;
    setLoadingConversations(true);
    fetch('/api/conversations')
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => {
        setConversationsFromApi(data.conversations ?? []);
      })
      .catch(() => setConversationsFromApi([]))
      .finally(() => setLoadingConversations(false));
  }, [currentUser?.id]);

  // When ?userId= is present: find/create via API and redirect to ?conversation=
  useEffect(() => {
    if (!userIdParam || !currentUser) return;
    if (userIdParam === currentUser.id) return;
    let cancelled = false;
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherUserId: userIdParam }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const convId = data.conversation?.id;
        if (convId) {
          router.replace(`/messages?conversation=${convId}`, { scroll: false });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userIdParam, currentUser?.id, router]);

  // When ?job= is present: resolve contractor and redirect to ?userId=
  useEffect(() => {
    if (!jobIdParam || !currentUser) return;
    const job = store.getJobById(jobIdParam);
    if (job) {
      const contractorId = job.contractorId;
      if (contractorId === currentUser.id) return;
      router.replace(`/messages?userId=${contractorId}`, { scroll: false });
      return;
    }
    let cancelled = false;
    fetch(`/api/jobs/${jobIdParam}/minimal`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.contractorId) return;
        if (data.contractorId === currentUser.id) return;
        router.replace(`/messages?userId=${data.contractorId}`, { scroll: false });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [jobIdParam, currentUser?.id, store, router]);

  // Load job context when conversation has jobId (for action cards)
  const convJobId = selectedConversation
    ? (conversationsFromApi.find((c) => c.id === selectedConversation)?.jobId ??
        (conversationFromMessagesApi?.id === selectedConversation ? conversationFromMessagesApi.jobId : null))
    : null;

  useEffect(() => {
    if (!convJobId) {
      setJobFromApi(null);
      return;
    }
    setLoadingJob(true);
    fetch(`/api/jobs/${convJobId}/messaging-context`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.job) {
          setJobFromApi({
            id: data.job.id,
            contractorId: data.job.contractorId,
            title: data.job.title,
            status: data.job.status,
            selectedSubcontractor: data.job.selectedSubcontractor ?? null,
            confirmedSubcontractor: data.job.confirmedSubcontractor ?? null,
            cancellationReason: data.job.cancellationReason ?? null,
            applications: data.applications ?? [],
          });
        } else {
          setJobFromApi(null);
        }
      })
      .catch(() => setJobFromApi(null))
      .finally(() => setLoadingJob(false));
  }, [convJobId, currentUser?.id]);

  // Load messages when conversation is selected; also backfill conversation if not in list (e.g. direct link)
  useEffect(() => {
    if (!selectedConversation || !currentUser) {
      setMessagesFromApi([]);
      setConversationFromMessagesApi(null);
      return;
    }
    setLoadingMessages(true);
    fetch(`/api/messages?conversationId=${selectedConversation}`)
      .then((res) => (res.ok ? res.json() : { messages: [], conversation: null }))
      .then((data) => {
        setMessagesFromApi(data.messages ?? []);
        setConversationFromMessagesApi(data.conversation ?? null);
      })
      .catch(() => {
        setMessagesFromApi([]);
        setConversationFromMessagesApi(null);
      })
      .finally(() => setLoadingMessages(false));
  }, [selectedConversation, currentUser?.id]);

  useEffect(() => {
    setSendError(undefined);
    if (selectedConversation && currentUser) {
      store.markConversationAsRead(selectedConversation, currentUser.id);
    }
  }, [selectedConversation, currentUser, store]);

  // Load user_blocks from Supabase when user is present
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/user-blocks')
      .then((res) => (res.ok ? res.json() : { blocks: [] }))
      .then((data) => {
        const blocks = (data.blocks ?? []).map((b: any) => ({
          id: b.id,
          blockerId: b.blockerId ?? b.blocker_id,
          blockedId: b.blockedId ?? b.blocked_id,
          createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        }));
        store.setUserBlocks(blocks);
      })
      .catch(() => {});
  }, [currentUser?.id, store]);

  const conversations = conversationsFromApi;

  const currentConversation = selectedConversation
    ? (conversationsFromApi.find((c) => c.id === selectedConversation) ??
        (conversationFromMessagesApi?.id === selectedConversation
          ? {
              id: conversationFromMessagesApi.id,
              contractorId: conversationFromMessagesApi.contractorId,
              subcontractorId: conversationFromMessagesApi.subcontractorId,
              jobId: conversationFromMessagesApi.jobId,
              otherUserId: conversationFromMessagesApi.otherUserId ?? '',
              otherUserName: conversationFromMessagesApi.otherUserName ?? 'Unknown',
              otherUserAvatar: conversationFromMessagesApi.otherUserAvatar ?? null,
              lastMessage: null,
              jobTitle: null,
              jobStatus: null,
              updatedAt: '',
            }
          : conversations.find((c) => c.id === selectedConversation)) ??
        null)
    : null;

  const currentJob = jobFromApi ?? (currentConversation?.jobId ? store.getJobById(currentConversation.jobId) : null);

  const otherUserId = currentConversation?.otherUserId ?? null;

  const otherUser = otherUserId
    ? { id: otherUserId, name: currentConversation?.otherUserName ?? 'Unknown', avatar: currentConversation?.otherUserAvatar ?? undefined }
    : null;

  const messages = messagesFromApi.map((m) => ({
    ...m,
    createdAt: typeof m.createdAt === 'string' ? new Date(m.createdAt) : m.createdAt,
  }));

  // All hooks must be called before any early returns
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!otherUserId) return;
    debugProfileCardData('messages', { id: otherUserId });
  }, [otherUserId]);

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Redirecting to login…
      </div>
    );
  }

  const needsAbnForActions = needsBusinessVerification(currentUser);
  const messagesReturnUrl = '/messages' + (selectedConversation ? `?conversation=${selectedConversation}` : '');
  const isBlockedByRecipient = otherUserId ? store.isBlocked(otherUserId, currentUser.id) : false;
  const messagingState = getMessagingState(currentJob || null, currentUser, {
    isBlockedByRecipient,
  });

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
        setSuggestLoading(false);
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
          jobId: currentJob?.id ?? currentConversation?.jobId ?? null,
          jobTitle: currentJob?.title ?? currentConversation?.jobTitle ?? null,
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

  const handleReportUser = async () => {
    if (!otherUserId || !currentUser || !reportCategory) return;
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/user-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedId: otherUserId,
          conversationId: currentConversation?.id ?? null,
          category: reportCategory,
          notes: reportNotes.trim() || null,
          alsoBlock: reportAlsoBlock,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to submit report');
        setReportSubmitting(false);
        return;
      }
      setReportDialogOpen(false);
      setReportCategory('');
      setReportNotes('');
      setReportAlsoBlock(false);
      if (reportAlsoBlock) {
        store.blockUser(currentUser.id, otherUserId);
        setBlocksUpdated((c) => c + 1);
        toast.success('Report submitted. User has been blocked.');
      } else {
        toast.success('Report submitted. Thank you for helping keep TradeHub safe.');
      }
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!otherUserId || !currentUser) return;
    try {
      const res = await fetch('/api/user-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: otherUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to block user');
        return;
      }
      store.blockUser(currentUser.id, otherUserId);
      setBlockConfirmOpen(false);
      setBlocksUpdated((c) => c + 1);
      toast.success('User blocked. They can no longer message you.');
    } catch {
      toast.error('Failed to block user');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation || !currentUser) return;
    if (otherUserId && store.isBlocked(otherUserId, currentUser.id)) {
      setSendError('You cannot send messages in this conversation.');
      return;
    }

    const validation = validateMessage(messageText);
    if (!validation.isValid) {
      setSendError(validation.error);
      return;
    }

    setSendError(undefined);
    setIsSending(true);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          contractorId: currentConversation.contractorId,
          subcontractorId: currentConversation.subcontractorId,
          text: messageText.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send message');
        setIsSending(false);
        return;
      }

      const msg = data.message;
      if (msg) {
        const newConvId = msg.conversationId;
        if (newConvId && newConvId !== currentConversation.id) {
          setSelectedConversation(newConvId);
          router.replace(`/messages?conversation=${newConvId}`, { scroll: false });
          fetch('/api/conversations')
            .then((res) => (res.ok ? res.json() : { conversations: [] }))
            .then((data) => setConversationsFromApi(data.conversations ?? []))
            .catch(() => {});
        }
        const newMsg = {
          id: msg.id,
          conversationId: newConvId ?? currentConversation.id,
          senderId: msg.senderId,
          text: msg.text,
          isSystemMessage: msg.isSystemMessage ?? false,
          createdAt: msg.createdAt,
        };
        setMessagesFromApi((prev) => [...prev, newMsg]);
        setConversationsFromApi((prev) =>
          prev.map((c) =>
            c.id === (newConvId ?? currentConversation.id)
              ? { ...c, lastMessage: newMsg, updatedAt: msg.createdAt ?? c.updatedAt }
              : c
          )
        );
        store.addMessage({
          ...newMsg,
          createdAt: new Date(newMsg.createdAt),
        });
      }
      setMessageText('');
      setSendError(undefined);
    } catch {
      setSendError('Network error. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const addSystemMessageIfNeeded = (jobId: string, newStatus: string) => {
    if (!currentConversation) return;

    const msgs = messages;
    if (shouldAddSystemMessage(msgs, newStatus as any)) {
      const systemMsg = createSystemMessage(
        currentConversation.id,
        newStatus as any,
        currentJob?.cancellationReason ?? undefined
      );
      store.addMessage(systemMsg);
      setMessagesFromApi((prev) => [
        ...prev,
        {
          id: systemMsg.id,
          conversationId: systemMsg.conversationId,
          senderId: systemMsg.senderId,
          text: systemMsg.text,
          isSystemMessage: true,
          createdAt: systemMsg.createdAt.toISOString(),
        },
      ]);
    }
  };

  const refreshJobFromApi = () => {
    if (!convJobId) return;
    fetch(`/api/jobs/${convJobId}/messaging-context`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.job) {
          setJobFromApi({
            id: data.job.id,
            contractorId: data.job.contractorId,
            title: data.job.title,
            status: data.job.status,
            selectedSubcontractor: data.job.selectedSubcontractor ?? null,
            confirmedSubcontractor: data.job.confirmedSubcontractor ?? null,
            cancellationReason: data.job.cancellationReason ?? null,
            applications: data.applications ?? [],
          });
        }
      })
      .catch(() => {});
  };

  const handleAcceptJob = async () => {
    if (!currentJob || !currentConversation) return;
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, messagesReturnUrl);
      return;
    }
    const transition = canTransitionToStatus('accepted', 'confirmed');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${currentJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to accept');
        return;
      }
      addSystemMessageIfNeeded(currentJob.id, 'accepted');
      refreshJobFromApi();
      if (store.getJobById(currentJob.id)) {
        store.updateJob(currentJob.id, { status: 'confirmed' });
        const myApp = store.getApplicationsByJob(currentJob.id).find((a) => a.subcontractorId === currentUser?.id);
        if (myApp) store.updateApplication(myApp.id, { status: 'accepted', respondedAt: new Date() });
      }
      toast.success('Job accepted!');
      router.refresh();
    } catch {
      toast.error('Failed to accept job');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDeclineJob = async () => {
    if (!currentJob || !currentConversation) return;
    const transition = canTransitionToStatus('accepted', 'open');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${currentJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to decline');
        return;
      }
      addSystemMessageIfNeeded(currentJob.id, 'open');
      refreshJobFromApi();
      if (store.getJobById(currentJob.id)) {
        store.updateJob(currentJob.id, { status: 'open', selectedSubcontractor: undefined });
        const myApp = store.getApplicationsByJob(currentJob.id).find((a) => a.subcontractorId === currentUser?.id);
        if (myApp) store.updateApplication(myApp.id, { status: 'declined', respondedAt: new Date() });
      }
      toast.success('Job declined');
      router.refresh();
    } catch {
      toast.error('Failed to decline job');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmHire = async () => {
    if (!currentJob || !currentConversation) return;
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, messagesReturnUrl);
      return;
    }
    const transition = canTransitionToStatus('accepted', 'confirmed', {
      hasSelectedSubcontractor: !!currentJob.selectedSubcontractor,
    });
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${currentJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to confirm');
        return;
      }
      addSystemMessageIfNeeded(currentJob.id, 'confirmed');
      refreshJobFromApi();
      if (store.getJobById(currentJob.id)) {
        store.updateJob(currentJob.id, { status: 'confirmed', confirmedSubcontractor: currentJob.selectedSubcontractor ?? undefined });
        const selectedApp = store.getApplicationsByJob(currentJob.id).find((a) => a.subcontractorId === (currentJob.selectedSubcontractor ?? undefined));
        if (selectedApp) store.updateApplication(selectedApp.id, { status: 'confirmed' });
      }
      toast.success('Hire confirmed!');
      router.refresh();
    } catch {
      toast.error('Failed to confirm hire');
    } finally {
      setActionSubmitting(false);
    }
  };

  const isContractor = currentUser.role === 'contractor';
  const showEmptyState = messages.length === 0 || !hasMessages(messages);
  const showMessagesLoading = selectedConversation && loadingMessages;

  const handleMobileBack = () => {
    setSelectedConversation(null);
    router.replace('/messages', { scroll: false });
  };

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Messaging workspace — flex-1 min-h-0 to stretch within parent */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ========== MOBILE: Inbox list or Thread view ========== */}
          <div className="flex flex-col md:hidden flex-1 min-h-0 w-full overflow-hidden bg-white">
            {!selectedConversation ? (
              /* Mobile inbox list */
              <>
                <div className="shrink-0 border-b border-slate-200 px-4 py-4">
                  <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  {loadingConversations ? (
                    <div className="py-8 text-center text-sm text-slate-500">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="py-8 px-4">
                      <EmptyState
                        icon={MessageSquare}
                        title="No messages yet"
                        description="Message any user from their profile, search, or jobs to start a conversation."
                        ctaLabel="Browse jobs"
                        onCtaClick={() => router.push('/jobs')}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conv) => {
                        const unread = (conv as { unreadCount?: number }).unreadCount ?? 0;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => {
                              setSelectedConversation(conv.id);
                              router.replace(`/messages?conversation=${conv.id}`, { scroll: false });
                            }}
                            className={`w-full rounded-xl p-4 text-left transition-colors border touch-manipulation ${
                              unread > 0
                                ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                                : 'border-transparent hover:bg-slate-50 active:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar avatarUrl={conv.otherUserAvatar ?? undefined} userName={conv.otherUserName} size="md" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-gray-900 truncate">{conv.otherUserName}</p>
                                  {unread > 0 && (
                                    <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                                      {unread > 99 ? '99+' : unread}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 truncate">
                                  {conv.lastMessage?.text ?? conv.jobTitle ?? 'Direct message'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Mobile thread view — full-screen with back button */
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-white">
                {/* Sticky header with back button */}
                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3 min-h-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 -ml-2"
                      onClick={handleMobileBack}
                      aria-label="Back to messages"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <UserAvatar avatarUrl={otherUser?.avatar ?? undefined} userName={otherUser?.name || ''} size="md" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{otherUser?.name}</p>
                      <p className="text-xs text-slate-600 truncate">{currentJob?.title ?? currentConversation?.jobTitle ?? 'Direct message'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(currentConversation?.jobId ?? currentJob?.id) && (
                        <Link href={`/jobs/${currentConversation?.jobId ?? currentJob?.id}`}>
                          <Button variant="outline" size="sm" className="h-9 text-xs">View Job</Button>
                        </Link>
                      )}
                      {otherUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Thread options">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={getPublicProfileHref(otherUserId)} className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                              <Flag className="h-4 w-4" />
                              Report User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setBlockConfirmOpen(true)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Ban className="h-4 w-4" />
                              Block User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
                {/* Scrollable messages */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4">
                  {showMessagesLoading ? (
                    <div className="flex items-center justify-center h-32 text-sm text-gray-500">Loading messages...</div>
                  ) : showEmptyState ? (
                    <EmptyMessages otherUserName={otherUser?.name} />
                  ) : (
                    <div className="space-y-4 min-w-0">
                      {currentJob && currentJob.status === 'accepted' && !isContractor && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">You&apos;ve been selected for this job!</h4>
                          <p className="text-sm text-blue-800 mb-4">
                            The contractor has selected you for &quot;{currentJob.title}&quot;. Accept to proceed.
                          </p>
                          <div className="flex flex-wrap gap-3 items-center">
                            <Button onClick={handleAcceptJob} size="sm" className="h-10" disabled={needsAbnForActions || actionSubmitting}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {actionSubmitting ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button onClick={handleDeclineJob} variant="outline" size="sm" className="h-10" disabled={actionSubmitting}>
                              <XCircle className="w-4 h-4 mr-2" />
                              {actionSubmitting ? 'Declining...' : 'Decline'}
                            </Button>
                            {needsAbnForActions && (
                              <p className="text-sm text-amber-700">
                                Verify your ABN to continue.{' '}
                                <Link href={getVerifyBusinessUrl(messagesReturnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                                  Verify ABN
                                </Link>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {currentJob && currentJob.status === 'accepted' && isContractor && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <h4 className="font-semibold text-green-900 mb-2">Subcontractor Accepted!</h4>
                          <p className="text-sm text-green-800 mb-4">
                            {otherUser?.name} has accepted the job. Confirm to finalize the hire.
                          </p>
                          <div className="flex flex-wrap gap-3 items-center">
                            <Button onClick={handleConfirmHire} size="sm" className="h-10" disabled={needsAbnForActions || actionSubmitting}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {actionSubmitting ? 'Confirming...' : 'Confirm Hire'}
                            </Button>
                            {needsAbnForActions && (
                              <p className="text-sm text-amber-700">
                                Verify your ABN to continue.{' '}
                                <Link href={getVerifyBusinessUrl(messagesReturnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                                  Verify ABN
                                </Link>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {currentJob && currentJob.status === 'confirmed' && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <h4 className="font-semibold text-green-900 mb-1">Job Confirmed!</h4>
                          <p className="text-sm text-green-800">This job has been confirmed and is ready to start.</p>
                        </div>
                      )}
                      {messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        return <MessageBubble key={msg.id} message={msg} isMe={isMe} />;
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                {/* Sticky composer */}
                <div className="shrink-0 border-t border-slate-200 bg-white p-4 safe-area-inset-bottom">
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
                </div>
                <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Block user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {otherUser?.name} will no longer be able to send you messages. The conversation history will remain visible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBlockUser} className="bg-red-600 hover:bg-red-700">
                        Block
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Dialog
                  open={reportDialogOpen}
                  onOpenChange={(open) => {
                    setReportDialogOpen(open);
                    if (!open) {
                      setReportCategory('');
                      setReportNotes('');
                      setReportAlsoBlock(false);
                    }
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Report user</DialogTitle>
                      <DialogDescription>
                        Report {otherUser?.name} for behaviour that violates platform standards. Your report will be reviewed by our team.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="report-category-mobile">Category *</Label>
                        <Select value={reportCategory} onValueChange={setReportCategory}>
                          <SelectTrigger id="report-category-mobile">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="harassment">Harassment or abusive behaviour</SelectItem>
                            <SelectItem value="spam">Spam</SelectItem>
                            <SelectItem value="scam">Scam or suspicious behaviour</SelectItem>
                            <SelectItem value="inappropriate_content">Inappropriate content</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="report-notes-mobile">Additional details (optional)</Label>
                        <Textarea
                          id="report-notes-mobile"
                          placeholder="Provide any additional context..."
                          value={reportNotes}
                          onChange={(e) => setReportNotes(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="report-also-block-mobile"
                          checked={reportAlsoBlock}
                          onCheckedChange={(checked) => setReportAlsoBlock(!!checked)}
                        />
                        <Label htmlFor="report-also-block-mobile" className="text-sm font-normal cursor-pointer">
                          Also block this user
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReportDialogOpen(false)} disabled={reportSubmitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleReportUser} disabled={!reportCategory || reportSubmitting}>
                        {reportSubmitting ? 'Submitting…' : 'Submit report'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* ========== DESKTOP: Two-panel layout (md+) ========== */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT PANEL — Conversations */}
          <aside className="md:h-full md:min-h-0 md:w-[320px] md:shrink-0 flex-col border-r border-slate-200 bg-white flex">
            <div className="shrink-0 border-b border-slate-200 px-5 py-4">
              <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingConversations ? (
                <div className="p-4 text-center text-sm text-slate-500">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Message any user from their profile, search, or jobs to start a conversation."
                  ctaLabel="Browse jobs"
                  onCtaClick={() => router.push('/jobs')}
                />
              ) : null}
              {conversations.map((conv) => {
                const unread = (conv as { unreadCount?: number }).unreadCount ?? 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
                      router.replace(`/messages?conversation=${conv.id}`, { scroll: false });
                    }}
                    className={`w-full rounded-xl p-3 text-left transition-colors ${
                      selectedConversation === conv.id
                        ? 'border border-blue-100 bg-blue-50'
                        : unread > 0
                          ? 'border border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                          : 'border border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar avatarUrl={conv.otherUserAvatar ?? undefined} userName={conv.otherUserName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">{conv.otherUserName}</p>
                          {unread > 0 && (
                            <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {conv.lastMessage?.text ?? conv.jobTitle ?? 'Direct message'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT PANEL — Chat area */}
          <section className="flex min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            {!selectedConversation ? (
              <div className="relative flex flex-1 min-h-0 h-full w-full items-center justify-center overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                  aria-hidden
                />
                <img
                  src="/TradeHub-Mark-blackout.svg"
                  alt=""
                  className="pointer-events-none absolute bottom-[-180px] right-[-180px] h-[900px] w-[900px] opacity-[0.06]"
                  aria-hidden
                />
                <div className="relative z-10 text-center">
                  <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 break-words">Select a conversation</h3>
                  <p className="text-sm text-slate-600 break-words">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 w-full overflow-hidden">
              <div className="flex h-full w-full min-h-0 items-stretch justify-center p-4 md:p-6">
                <div className="flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Conversation header */}
                  <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <UserAvatar
                          avatarUrl={otherUser?.avatar ?? undefined}
                          userName={otherUser?.name || ''}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate break-words">{otherUser?.name}</p>
                          <p className="text-sm text-gray-600 truncate break-words">
                            {currentJob?.title ?? currentConversation?.jobTitle ?? 'Direct message'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(currentConversation?.jobId ?? currentJob?.id) && (
                            <Link href={`/jobs/${currentConversation?.jobId ?? currentJob?.id}`}>
                              <Button variant="outline" size="sm" className="text-xs sm:text-sm whitespace-nowrap">
                                View Job
                              </Button>
                            </Link>
                          )}
                          {otherUserId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Thread options">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={getPublicProfileHref(otherUserId)} className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                                  <Flag className="h-4 w-4" />
                                  Report User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setBlockConfirmOpen(true)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Ban className="h-4 w-4" />
                                  Block User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>

                  {/* Message list — ONLY this section scrolls */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-5">
                {showMessagesLoading ? (
                  <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                    Loading messages...
                  </div>
                ) : showEmptyState ? (
                  <EmptyMessages otherUserName={otherUser?.name} />
                ) : (
                  <div className="space-y-4 min-w-0">
                    {currentJob && currentJob.status === 'accepted' && !isContractor && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">You've been selected for this job!</h4>
                        <p className="text-sm text-blue-800 mb-4">
                          The contractor has selected you for "{currentJob.title}". Accept to proceed.
                        </p>
                        <div className="flex flex-wrap gap-3 items-center">
                          <Button onClick={handleAcceptJob} size="sm" disabled={needsAbnForActions || actionSubmitting}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {actionSubmitting ? 'Accepting...' : 'Accept'}
                          </Button>
                          <Button onClick={handleDeclineJob} variant="outline" size="sm" disabled={actionSubmitting}>
                            <XCircle className="w-4 h-4 mr-2" />
                            {actionSubmitting ? 'Declining...' : 'Decline'}
                          </Button>
                          {needsAbnForActions && (
                            <p className="text-sm text-amber-700">
                              Verify your ABN to continue.{' '}
                              <Link href={getVerifyBusinessUrl(messagesReturnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                                Verify ABN
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {currentJob && currentJob.status === 'accepted' && isContractor && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Subcontractor Accepted!</h4>
                        <p className="text-sm text-green-800 mb-4">
                          {otherUser?.name} has accepted the job. Confirm to finalize the hire.
                        </p>
                        <div className="flex flex-wrap gap-3 items-center">
                          <Button onClick={handleConfirmHire} size="sm" disabled={needsAbnForActions || actionSubmitting}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {actionSubmitting ? 'Confirming...' : 'Confirm Hire'}
                          </Button>
                          {needsAbnForActions && (
                            <p className="text-sm text-amber-700">
                              Verify your ABN to continue.{' '}
                              <Link href={getVerifyBusinessUrl(messagesReturnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                                Verify ABN
                              </Link>
                            </p>
                          )}
                        </div>
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

                  {/* Composer — pinned to bottom */}
                  <div className="shrink-0 border-t border-slate-200 bg-white p-4">
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
                  </div>
                </div>
              </div>

              <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Block user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {otherUser?.name} will no longer be able to send you messages. The conversation history will remain visible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBlockUser}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Block
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog
                open={reportDialogOpen}
                onOpenChange={(open) => {
                  setReportDialogOpen(open);
                  if (!open) {
                    setReportCategory('');
                    setReportNotes('');
                    setReportAlsoBlock(false);
                  }
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Report user</DialogTitle>
                    <DialogDescription>
                      Report {otherUser?.name} for behaviour that violates platform standards. Your report will be reviewed by our team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="report-category">Category *</Label>
                      <Select value={reportCategory} onValueChange={setReportCategory}>
                        <SelectTrigger id="report-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="harassment">Harassment or abusive behaviour</SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="scam">Scam or suspicious behaviour</SelectItem>
                          <SelectItem value="inappropriate_content">Inappropriate content</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="report-notes">Additional details (optional)</Label>
                      <Textarea
                        id="report-notes"
                        placeholder="Provide any additional context..."
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="report-also-block"
                        checked={reportAlsoBlock}
                        onCheckedChange={(checked) => setReportAlsoBlock(!!checked)}
                      />
                      <Label
                        htmlFor="report-also-block"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Also block this user
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setReportDialogOpen(false)}
                      disabled={reportSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReportUser}
                      disabled={!reportCategory || reportSubmitting}
                    >
                      {reportSubmitting ? 'Submitting…' : 'Submit report'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            )}
          </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
