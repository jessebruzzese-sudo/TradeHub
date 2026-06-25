// vim: ts=2
'use client';

/*
 * QA notes — ABN gating (Messages):
 * - /messages list and thread reading work for unverified users.
 * - Plain sending messages remains allowed for unverified.
 * - Commitment action cards (Accept/Decline, Confirm hire, Award job, etc.) are blocked for unverified:
 *   disabled button + "Verify ABN to continue" + CTA link to /verify-business. Verified users use action cards normally.
 */

import { getAxios } from "@/lib/utils";
import { UnauthorizedAccess } from "@/components/unauthorized-access";
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { 
	MessageSquare, 
	CheckCircle, 
	XCircle, 
	MoreVertical, 
	User,
 	Ban, 
	Flag, 
	ChevronLeft 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useContext } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MessageInput } from '@/components/message-input';
import { MessageBubble } from '@/components/message-bubble';
import { EmptyMessages } from '@/components/empty-messages';
import { canTransitionToStatus } from '@/lib/job-lifecycle';
import { AppLayout } from '@/components/app-nav';
import { callTradeHubAI } from '@/lib/ai-client';
import { EmptyState } from '@/components/empty-state';
import { 
	needsBusinessVerification, 
	redirectToVerifyBusiness, 
	getVerifyBusinessUrl 
} from '@/lib/verification-guard';
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
import UserContext from "@/lib/user-context";

export default function MessagesPage() {

  const { jwt } = useAuth();
	const hasSession = jwt !== null && jwt !== undefined;
	const UserSession = useContext(UserContext);
  const router = useRouter();
  const hasRedirected = useRef(false);

	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
  const [selectedConversation, setSelectedConversation] = useState<string|null>(null);
  const [messageText, setMessageText] = useState(""); // current message
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string|undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<any|null>(null); // list of different conversations that exist
  const [messages, setMessages] = useState<any|null>(null); // messages for current conversation
  const [job, setJob] = useState<any|null>(null); // job linked to conversation, might not exist
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<any|null>(null);
		
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<string>("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportAlsoBlock, setReportAlsoBlock] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

	const loadingConversations = conversations === null;
	const loadingMessages = !loadingConversations && messages === null;
	const loadingJob = job === null;

	/* START HOOKS */

  useEffect(() => {
		if(!hasSession){
			return;
		}
		if(conversations !== null){
			return;
		}
		getAxios(null).get("/api/conversations").
			then((response_)=>{
				const data = response_.data;
				setConversations(data);
			}).catch((error_)=>{
				const msg = error_?.response?.data?.error ?? null;
				if(msg){
					toast.error(msg);
				}
			});
  }, [conversations]);
	
  useEffect(() => {
		if(!hasSession){
			return;
		}
		if(selectedConversation === null){
			return;
		}
		if(messages !== null){
			return;
		}
		getAxios(null).get(`/api/conversations/${selectedConversation}/messages`).
			then((response_)=>{
				const messages = response_.data;
				setMessages(messages);
			}).catch((err_)=>{
				const msg = err_?.response?.data?.error ?? null;
				if(msg){
					toast.error(msg);
				}
			});
  }, [selectedConversation, messages]);

 	/* END HOOKS */

	/* START EVENT HANDLERS */

	const handleSendMessage = () => {
		toast.info("coming soon");
	};

	const handleSuggestReply = () => {
		toast.info("coming soon");
	};

	const handleSelectSuggestion = () => {
		toast.info("coming soon");
	};
		
	const handleBlockUser = () => {
		toast.info("coming soon");
	};

	const handleReportUser = () => {
		toast.info("coming soon");
	};

	/* END EVENT HANDLERS */

  if (!hasSession) {
		return <UnauthorizedAccess redirectTo="/login" message={"Redirecting to login"} />
  }

	// selected conversation state
	const showEmptyState = true;
	let convo = null;
	let selectedGuestProfileId = null;
	let selectedGuestName = null;
	let selectedGuestUserId = null;
	let messagingState = {
		isReadOnly: false,
		canSendMessages: true
	};
	if(conversations !== null && conversations.length > 0 && selectedConversation !== null){
		convo = conversations.find((x)=>x.id === selectedConversation);
		if(convo === undefined){
			console.error("selected conversation is null");
		}
		// details of the "other user
		// could be owner of the conversation
		// or the guest, depends on who started it
		selectedGuestProfileId = convo?.guestProfileId ?? null;
		selectedGuestUserId = convo?.guestUserId ?? null;
		selectedGuestName = convo?.guestName ?? null;
	}

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Messaging workspace — flex-1 min-h-0 to stretch within parent */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ========== MOBILE: Inbox list or Thread view ========== */}
          <div className="flex flex-col md:hidden flex-1 min-h-0 w-full overflow-hidden bg-white">
            { !selectedConversation ? (
              /* Mobile inbox list */
              <>
                <div className="shrink-0 border-b border-slate-200 px-4 py-4">
                  <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  {loadingConversations ? (
                    <div className="py-8 text-center text-sm text-slate-500">Loading conversations...</div>
                  ) : ( conversations?.length ?? 0 ) === 0 && !selectedConversation ? (
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
                            }}
                            className={`w-full rounded-xl p-4 text-left transition-colors border touch-manipulation ${
                              unread > 0
                                ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                                : 'border-transparent hover:bg-slate-50 active:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar avatarUrl={`/api/profile/${conv.guestProfileId}/avatar`} userName={conv.guestName} size="md" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-gray-900 truncate">{conv.guestName}</p>
                                  {unread > 0 && (
                                    <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                                      {unread > 99 ? '99+' : unread}
                                    </span>
                                  )}
                        					<p className="text-xs text-slate-600 truncate">
                          					{conv.lastMessage?.text ?? conv.jobTitle ?? 'Direct message'}
                        					</p>
                                </div>
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
                      onClick={()=>{ console.log("handle mobile back...");}}
                      aria-label="Back to messages"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <UserAvatar avatarUrl={`/api/profile/${selectedGuestProfileId}/avatar`} userName={selectedGuestName} size="md" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{selectedGuestName}</p>
                      <p className="text-xs text-slate-600 truncate">{job?.title ?? convo?.jobTitle ?? 'Direct message'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(convo?.jobId ?? job?.id) && (
                        <Link href={`/jobs/${covo?.jobId ?? job?.id}`}>
                          <Button variant="outline" size="sm" className="h-9 text-xs">View Job</Button>
                        </Link>
                      )}
                      {selectedGuestProfileId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Thread options">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={getPublicProfileHref(selectedGuestProfileId)} className="flex items-center gap-2">
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
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-32 text-sm text-gray-500">Loading messages...</div>
                  ) : showEmptyState ? (
                    <EmptyMessages otherUserName={selectedGuestName} />
                  ) : (
                    <div className="space-y-4 min-w-0">
                      {job && job.status === 'accepted' && !isContractor && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">You&apos;ve been selected for this job!</h4>
                          <p className="text-sm text-blue-800 mb-4">
                            The contractor has selected you for &quot;{job.title}&quot;. Accept to proceed.
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
                      {job && job.status === 'accepted' && isContractor && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <h4 className="font-semibold text-green-900 mb-2">Subcontractor Accepted!</h4>
                          <p className="text-sm text-green-800 mb-4">
                            {selectedGuestName} has accepted the job. Confirm to finalize the hire.
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
                      {job && job.status === 'confirmed' && (
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
                        {selectedGuestName} will no longer be able to send you messages. 
												The conversation history will remain visible.
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
                        Report {selectedGuestName} for behaviour that violates platform standards. Your report will be reviewed by our team.
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
              { loadingConversations ? (
                <div className="p-4 text-center text-sm text-slate-500">Loading conversations...</div>
              ) : conversations.length === 0 && !selectedConversation ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Message any user from their profile, search, or jobs to start a conversation."
                  ctaLabel="Browse jobs"
                  onCtaClick={() => router.push('/jobs')}
                />
              ) : null}
              {(conversations ?? []).map((conv) => {
                const unread = (conv as { unreadCount?: number }).unreadCount ?? 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
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
                      <UserAvatar avatarUrl={`/api/profile/${conv.guestProfileId}/avatar`} userName={conv.guestName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">{conv.guestName}</p>
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
                          avatarUrl={`/api/profile/${selectedGuestProfileId}/avatar`}
                          userName={selectedGuestName}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate break-words">{selectedGuestName}</p>
                          <p className="text-sm text-gray-600 truncate break-words">
                            {job?.title ?? convo?.jobTitle ?? 'Direct message'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(convo?.jobId ?? job?.id) && (
                            <Link href={`/jobs/${convo?.jobId ?? job?.id}`}>
                              <Button variant="outline" size="sm" className="text-xs sm:text-sm whitespace-nowrap">
                                View Job
                              </Button>
                            </Link>
                          )}
                          {selectedGuestProfileId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Thread options">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={getPublicProfileHref(selectedGuestUserId)} className="flex items-center gap-2">
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
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                    Loading messages...
                  </div>
                ) : showEmptyState ? (
                  <EmptyMessages otherUserName={selectedGuestName} />
                ) : (
                  <div className="space-y-4 min-w-0">
                    {job && job.status === 'accepted' && !isContractor && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">You've been selected for this job!</h4>
                        <p className="text-sm text-blue-800 mb-4">
                          The contractor has selected you for "{job.title}". Accept to proceed.
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

                    {job && job.status === 'accepted' && isContractor && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Subcontractor Accepted!</h4>
                        <p className="text-sm text-green-800 mb-4">
                          {selectedGuestName} has accepted the job. Confirm to finalize the hire.
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

                    {job && job.status === 'confirmed' && (
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
                      {selectedGuestName} will no longer be able to send you messages. The conversation history will remain visible.
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
                      Report {selectedGuestName} for behaviour that violates platform standards. 
											Your report will be reviewed by our team.
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
