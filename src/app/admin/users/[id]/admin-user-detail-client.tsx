'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getStore } from '@/lib/store';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { AdminNotesPanel } from '@/components/admin-notes-panel';
import { AuditLogView } from '@/components/audit-log-view';
import { AdminConfirmationDialog } from '@/components/admin-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Shield, ShieldAlert, ShieldCheck, AlertCircle, CheckCircle, Flag, XCircle, MessageSquareOff, FileWarning, Ban } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createAuditLog } from '@/lib/admin-utils';
import { AdminNote } from '@/lib/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { User } from '@/lib/types';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import { ProfileView } from '@/components/profile/profile-view';

interface AccountReview {
  id: string;
  user_id: string;
  status: 'pending' | 'reviewed' | 'flagged' | 'suspended';
  reviewed_by: string | null;
  reviewed_at: string | null;
  flag_reason: string | null;
  notes: string | null;
  created_at: string;
}

interface ReportReceived {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  conversationId: string | null;
  category: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface ReportSubmitted {
  id: string;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  conversationId: string | null;
  category: string;
  status: string;
  createdAt: string;
}

interface BlockByUser {
  id: string;
  blockedId: string;
  blockedName: string;
  createdAt: string;
}

interface BlockOfUser {
  id: string;
  blockerId: string;
  blockerName: string;
  createdAt: string;
}

interface MessagingSafetyData {
  reportsReceived: ReportReceived[];
  reportsSubmitted: ReportSubmitted[];
  blocksByUser: BlockByUser[];
  blocksOfUser: BlockOfUser[];
}

interface AdminUserDetailClientProps {
  user: User;
  accountReview: AccountReview | null;
  userId: string;
  profileData: Record<string, unknown>;
  strengthCalc: ProfileStrengthCalc | null;
  viewerLikeState: { liked: boolean; count: number } | null;
  profileIsViewer: boolean;
}

export function AdminUserDetailClient({
  user,
  accountReview: initialAccountReview,
  userId,
  profileData,
  strengthCalc,
  viewerLikeState,
  profileIsViewer,
}: AdminUserDetailClientProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const store = getStore();

  const [accountReview, setAccountReview] = useState<AccountReview | null>(initialAccountReview);
  const [showAccountReviewDialog, setShowAccountReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'reviewed' | 'flagged' | 'suspended'>('reviewed');
  const [reviewNotes, setReviewNotes] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const [showAbnDialog, setShowAbnDialog] = useState(false);
  const [abnAction, setAbnAction] = useState<'verify' | 'reject'>('verify');
  const [abnRejectionReason, setAbnRejectionReason] = useState('');
  const [savingAbn, setSavingAbn] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    action: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    actionLabel: '',
    action: () => {},
  });

  const [messagingSafety, setMessagingSafety] = useState<MessagingSafetyData | null>(null);
  const [messagingSafetyLoading, setMessagingSafetyLoading] = useState(true);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMessagingSafetyLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}/messaging-safety`);
        if (!res.ok) throw new Error('Failed to load messaging safety');
        const data = await res.json();
        if (!cancelled) setMessagingSafety(data);
      } catch {
        if (!cancelled) setMessagingSafety({ reportsReceived: [], reportsSubmitted: [], blocksByUser: [], blocksOfUser: [] });
      } finally {
        if (!cancelled) setMessagingSafetyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleReportStatusUpdate = async (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    setUpdatingReportId(reportId);
    try {
      const res = await fetch(`/api/admin/user-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setMessagingSafety((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reportsReceived: prev.reportsReceived.map((r) =>
            r.id === reportId ? { ...r, status: updated.status } : r
          ),
        };
      });
      toast.success(`Report marked as ${status}`);
    } catch {
      toast.error('Failed to update report status');
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleSubmitAccountReview = async () => {
    if (!accountReview || !currentUser) return;

    if (reviewAction === 'flagged' || reviewAction === 'suspended') {
      if (!flagReason.trim()) {
        toast.error('Please provide a reason for this action');
        return;
      }
    }

    const status = reviewAction === 'reviewed' ? 'approved' : 'rejected';
    const notes = reviewAction === 'reviewed' ? reviewNotes : flagReason;

    setSavingReview(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/account-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      const result = await res.json();

      if (!result.ok) {
        throw new Error(result.error);
      }

      toast.success('Account review submitted');
      setShowAccountReviewDialog(false);
      setAccountReview({
        ...accountReview,
        status: reviewAction,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null,
        flag_reason: reviewAction === 'flagged' || reviewAction === 'suspended' ? flagReason : null,
      });
      router.refresh();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSubmitAbnVerification = async () => {
    if (!user || !currentUser) return;

    if (abnAction === 'reject' && !abnRejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const abn_status = abnAction === 'verify' ? 'VERIFIED' : 'REJECTED';
    const body = abnAction === 'reject'
      ? { abn_status, reason: abnRejectionReason }
      : { abn_status };

    setSavingAbn(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/abn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (!result.ok) {
        throw new Error(result.error);
      }

      const auditLog = createAuditLog(
        currentUser.id,
        abnAction === 'verify' ? 'abn_verified' : 'abn_rejected',
        `${abnAction === 'verify' ? 'Verified' : 'Rejected'} ABN for ${user.name} (${user.email})`,
        { targetUserId: user.id, additionalData: abnAction === 'reject' ? { reason: abnRejectionReason } : undefined }
      );
      store.addAuditLog(auditLog);

      toast.success(`ABN ${abnAction === 'verify' ? 'verified' : 'rejected'} successfully`);
      setShowAbnDialog(false);
      setAbnRejectionReason('');
      router.refresh();
    } catch (error) {
      console.error('Error updating ABN status:', error);
      toast.error('Failed to update ABN status');
    } finally {
      setSavingAbn(false);
    }
  };

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  const auditLogs = store.getAuditLogsByUser(userId);
  const adminNotes = store.getAdminNotesByUser(userId);

  const handleAddNote = (noteText: string) => {
    const note: AdminNote = {
      id: `note-${Date.now()}`,
      adminId: currentUser.id,
      userId: user.id,
      note: noteText,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.addAdminNote(note);

    const auditLog = createAuditLog(
      currentUser.id,
      'admin_note_added',
      `Added admin note for user ${user.name}`,
      {
        targetUserId: user.id,
        additionalData: { notePreview: noteText.substring(0, 50) },
      }
    );
    store.addAuditLog(auditLog);

    router.refresh();
  };

  const handleVerifyUser = () => {
    setConfirmDialog({
      open: true,
      title: 'Verify User',
      description: `Verify ${user.name}'s account to give them verified status. This indicates they have been confirmed as a legitimate, quality member of the platform.`,
      actionLabel: 'Verify User',
      action: () => {
        const auditLog = createAuditLog(
          currentUser.id,
          'user_verification_approved',
          `Verified user ${user.name} (${user.email})`,
          { targetUserId: user.id }
        );
        store.addAuditLog(auditLog);

        alert('User verification functionality coming soon');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        router.refresh();
      },
    });
  };

  const handleSuspendUser = () => {
    setConfirmDialog({
      open: true,
      title: 'Place Account on Hold',
      description: `Are you sure you want to place ${user.name}'s account on hold? They will be notified with details about this decision and steps to resolve. Their access will be temporarily limited while the issue is reviewed.`,
      actionLabel: 'Place on Hold',
      variant: 'destructive',
      action: () => {
        const auditLog = createAuditLog(
          currentUser.id,
          'user_suspended',
          `Placed account on hold for ${user.name} (${user.email})`,
          { targetUserId: user.id }
        );
        store.addAuditLog(auditLog);

        alert('Account hold functionality coming soon');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        router.refresh();
      },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2">
            {user.trustStatus !== 'verified' && (
              <Button onClick={handleVerifyUser} variant="outline" size="sm">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify User
              </Button>
            )}
            <Button
              onClick={handleSuspendUser}
              variant="outline"
              size="sm"
              className="text-orange-600 hover:text-orange-700"
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Place on Hold
            </Button>
          </div>
        </div>

        <ProfileView
          mode="public"
          profile={profileData}
          isMe={profileIsViewer}
          strengthCalc={strengthCalc}
          viewerLikeState={viewerLikeState}
          embedInParentLayout
        />

        {accountReview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  Account Review Status
                </span>
                {accountReview.status === 'pending' ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Pending Review
                  </Badge>
                ) : accountReview.status === 'reviewed' ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Reviewed
                  </Badge>
                ) : accountReview.status === 'flagged' ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    Flagged
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Suspended
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Created: {format(new Date(accountReview.created_at), 'MMM d, yyyy h:mm a')}</p>
                {accountReview.reviewed_at && (
                  <p>Reviewed: {format(new Date(accountReview.reviewed_at), 'MMM d, yyyy h:mm a')}</p>
                )}
              </div>

              {accountReview.flag_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Flag Reason:</p>
                  <p className="text-sm text-red-700">{accountReview.flag_reason}</p>
                </div>
              )}

              {accountReview.notes && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-800 mb-1">Review Notes:</p>
                  <p className="text-sm text-gray-600">{accountReview.notes}</p>
                </div>
              )}

              {accountReview.status === 'pending' && (
                <Button onClick={() => setShowAccountReviewDialog(true)}>
                  Take Action
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {user.abn && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  ABN Verification
                </span>
                {!user.abnStatus || user.abnStatus === 'UNVERIFIED' ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </Badge>
                ) : user.abnStatus === 'PENDING' ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </Badge>
                ) : user.abnStatus === 'VERIFIED' ? (
                  <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Rejected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">ABN: {user.abn}</p>
                {user.abnVerifiedAt && (
                  <p>Verified: {format(new Date(user.abnVerifiedAt), 'MMM d, yyyy h:mm a')}</p>
                )}
                {user.abnSubmittedAt && (
                  <p>Submitted: {format(new Date(user.abnSubmittedAt), 'MMM d, yyyy h:mm a')}</p>
                )}
              </div>

              {user.abnStatus === 'REJECTED' && user.abnRejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{user.abnRejectionReason}</p>
                </div>
              )}

              {(!user.abnStatus || user.abnStatus === 'UNVERIFIED' || user.abnStatus === 'PENDING') && (
                <div className="flex gap-2">
                  <Button onClick={() => { setAbnAction('verify'); setShowAbnDialog(true); }} size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify ABN
                  </Button>
                  <Button onClick={() => { setAbnAction('reject'); setShowAbnDialog(true); }} variant="outline" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject ABN
                  </Button>
                </div>
              )}

              {user.abnStatus === 'REJECTED' && (
                <Button onClick={() => { setAbnAction('verify'); setShowAbnDialog(true); }} size="sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify ABN
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <AdminNotesPanel notes={adminNotes} users={store.users} onAddNote={handleAddNote} />

        <AuditLogView
          logs={auditLogs}
          users={store.users}
          title="User Activity Log"
          emptyMessage="No audit entries for this user"
        />

        {/* Messaging Safety */}
        <div className="space-y-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquareOff className="w-5 h-5 text-gray-600" />
            Messaging Safety
          </h2>

          {messagingSafetyLoading ? (
            <div className="text-sm text-gray-500">Loading messaging safety data...</div>
          ) : messagingSafety ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileWarning className="w-4 h-4 text-gray-600" />
                    Reports Received
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messagingSafety.reportsReceived.length === 0 ? (
                    <p className="text-sm text-gray-500">No reports received against this user.</p>
                  ) : (
                    <div className="space-y-4">
                      {messagingSafety.reportsReceived.map((r) => (
                        <div
                          key={r.id}
                          className="border border-gray-200 rounded-lg p-4 space-y-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Link href={`/admin/users/${r.reporterId}`} className="font-medium text-blue-600 hover:underline">{r.reporterName}</Link>
                            <span className="text-gray-500">•</span>
                            <span>{format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            <Badge variant="secondary" className="capitalize">{r.category.replace(/_/g, ' ')}</Badge>
                            <Badge variant={r.status === 'open' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                          </div>
                          {r.notes && <p className="text-sm text-gray-600">{r.notes}</p>}
                          {r.conversationId && (
                            <Link
                              href={`/admin/messages/${r.conversationId}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View conversation
                            </Link>
                          )}
                          {r.status === 'open' && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportStatusUpdate(r.id, 'reviewed')}
                                disabled={!!updatingReportId}
                              >
                                Reviewed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportStatusUpdate(r.id, 'resolved')}
                                disabled={!!updatingReportId}
                              >
                                Resolved
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportStatusUpdate(r.id, 'dismissed')}
                                disabled={!!updatingReportId}
                              >
                                Dismissed
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileWarning className="w-4 h-4 text-gray-600" />
                    Reports Submitted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messagingSafety.reportsSubmitted.length === 0 ? (
                    <p className="text-sm text-gray-500">This user has not submitted any reports.</p>
                  ) : (
                    <div className="space-y-4">
                      {messagingSafety.reportsSubmitted.map((r) => (
                        <div
                          key={r.id}
                          className="border border-gray-200 rounded-lg p-4 space-y-1"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-gray-600">Reported:</span>
                            <Link href={`/admin/users/${r.reportedId}`} className="font-medium text-blue-600 hover:underline">{r.reportedName}</Link>
                            <span className="text-gray-500">•</span>
                            <span>{format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            <Badge variant="secondary" className="capitalize">{r.category.replace(/_/g, ' ')}</Badge>
                            <Badge variant={r.status === 'open' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                          </div>
                          {r.conversationId && (
                            <Link
                              href={`/admin/messages/${r.conversationId}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View conversation
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Ban className="w-4 h-4 text-gray-600" />
                    Blocks Involving User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Users blocked by this account</h4>
                    {messagingSafety.blocksByUser.length === 0 ? (
                      <p className="text-sm text-gray-500">None</p>
                    ) : (
                      <ul className="space-y-2">
                        {messagingSafety.blocksByUser.map((b) => (
                          <li key={b.id} className="flex items-center justify-between border border-gray-200 rounded p-3 text-sm">
                            <Link href={`/admin/users/${b.blockedId}`} className="font-medium text-blue-600 hover:underline">{b.blockedName}</Link>
                            <span className="text-gray-500">{format(new Date(b.createdAt), 'MMM d, yyyy')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Users who blocked this account</h4>
                    {messagingSafety.blocksOfUser.length === 0 ? (
                      <p className="text-sm text-gray-500">None</p>
                    ) : (
                      <ul className="space-y-2">
                        {messagingSafety.blocksOfUser.map((b) => (
                          <li key={b.id} className="flex items-center justify-between border border-gray-200 rounded p-3 text-sm">
                            <Link href={`/admin/users/${b.blockerId}`} className="font-medium text-blue-600 hover:underline">{b.blockerName}</Link>
                            <span className="text-gray-500">{format(new Date(b.createdAt), 'MMM d, yyyy')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <AdminConfirmationDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
          title={confirmDialog.title}
          description={confirmDialog.description}
          actionLabel={confirmDialog.actionLabel}
          onConfirm={confirmDialog.action}
          variant={confirmDialog.variant}
        />

        <Dialog open={showAccountReviewDialog} onOpenChange={setShowAccountReviewDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review Account</DialogTitle>
              <DialogDescription>
                Take action on {user.name}'s account
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
                <Select value={reviewAction} onValueChange={(val) => setReviewAction(val as 'reviewed' | 'flagged' | 'suspended')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                    <SelectItem value="flagged">Flag for Issues</SelectItem>
                    <SelectItem value="suspended">Suspend Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(reviewAction === 'flagged' || reviewAction === 'suspended') && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Reason *</label>
                  <Textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Explain why this action is being taken..."
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAccountReviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAccountReview} disabled={savingReview}>
                {savingReview ? 'Saving...' : 'Submit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAbnDialog} onOpenChange={setShowAbnDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{abnAction === 'verify' ? 'Verify ABN' : 'Reject ABN'}</DialogTitle>
              <DialogDescription>
                {abnAction === 'verify'
                  ? `Confirm that ${user.name}'s ABN is valid and verified`
                  : `Reject ${user.name}'s ABN with a reason`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {abnAction === 'reject' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Rejection Reason *</label>
                  <Textarea
                    value={abnRejectionReason}
                    onChange={(e) => setAbnRejectionReason(e.target.value)}
                    placeholder="Explain why the ABN is being rejected..."
                    rows={4}
                  />
                </div>
              )}

              {abnAction === 'verify' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    By verifying this ABN, the user gains a stronger trust signal on the platform (posting jobs does not
                    require verification for now).
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAbnDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAbnVerification}
                disabled={savingAbn || (abnAction === 'reject' && !abnRejectionReason.trim())}
                variant={abnAction === 'reject' ? 'destructive' : 'default'}
              >
                {savingAbn ? 'Saving...' : abnAction === 'verify' ? 'Verify ABN' : 'Reject ABN'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
