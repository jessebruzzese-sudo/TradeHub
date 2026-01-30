'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import  StatusPill  from '@/components/status-pill';
import { AdminNotesPanel } from '@/components/admin-notes-panel';
import { AuditLogView } from '@/components/audit-log-view';
import { AdminConfirmationDialog } from '@/components/admin-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Shield, ShieldAlert, ShieldCheck, AlertCircle, CheckCircle, Flag, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createAuditLog } from '@/lib/admin-utils';
import { AdminNote } from '@/lib/types';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function AdminUserDetailPage() {
  const { currentUser } = useAuth();
  const supabase = getBrowserSupabase();
  const params = useParams();
  const router = useRouter();
  const store = getStore();
  const userId = params.id as string;

  const [accountReview, setAccountReview] = useState<AccountReview | null>(null);
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

  const loadAccountReview = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_account_reviews')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setAccountReview(data as AccountReview);
      }
    } catch (error) {
      console.error('Error loading account review:', error);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (currentUser?.role === 'admin' && userId) {
      loadAccountReview();
    }
  }, [currentUser, userId, loadAccountReview]);

  const handleSubmitAccountReview = async () => {
    if (!accountReview || !currentUser) return;

    setSavingReview(true);
    try {
      const updateData: any = {
        status: reviewAction,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null,
      };

      if (reviewAction === 'flagged' || reviewAction === 'suspended') {
        if (!flagReason.trim()) {
          toast.error('Please provide a reason for this action');
          setSavingReview(false);
          return;
        }
        updateData.flag_reason = flagReason;
      }

      const { error } = await supabase
        .from('admin_account_reviews')
        .update(updateData)
        .eq('id', accountReview.id);

      if (error) throw error;

      await supabase
        .from('users')
        .update({ account_reviewed: true })
        .eq('id', userId);

      toast.success('Account review submitted');
      setShowAccountReviewDialog(false);
      loadAccountReview();
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

    setSavingAbn(true);
    try {
      const updateData: any = {
        abn_status: abnAction === 'verify' ? 'VERIFIED' : 'REJECTED',
        abn_verified_by: currentUser.id,
        abn_verified_at: new Date().toISOString(),
      };

      if (abnAction === 'reject') {
        updateData.abn_rejection_reason = abnRejectionReason;
      } else {
        updateData.abn_rejection_reason = null;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

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

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  const user = store.getUserById(userId);

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <p className="text-gray-600">User not found</p>
        </div>
      </AppLayout>
    );
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
        setConfirmDialog({ ...confirmDialog, open: false });
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
        setConfirmDialog({ ...confirmDialog, open: false });
        router.refresh();
      },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            </div>
            <div className="flex gap-2">
              {user.trustStatus !== 'verified' && (
                <Button onClick={handleVerifyUser} variant="outline" size="sm">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify User
                </Button>
              )}
              <Button
                onClick={handleSuspendUser}
                variant="outline"
                size="sm"
                className="text-orange-600 hover:text-orange-700"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Place on Hold
              </Button>
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600" />
              User Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Role</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <StatusPill type="trust" status={user.trustStatus} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Rating</p>
                <p className="text-sm font-medium text-gray-900">{user.rating.toFixed(1)} / 5.0</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Completed Jobs</p>
                <p className="text-sm font-medium text-gray-900">{user.completedJobs}</p>
              </div>
              {user.businessName && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Business Name</p>
                  <p className="text-sm font-medium text-gray-900">{user.businessName}</p>
                </div>
              )}
              {user.abn && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">ABN</p>
                  <p className="text-sm font-medium text-gray-900">{user.abn}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <AdminNotesPanel
              notes={adminNotes}
              users={store.users}
              onAddNote={handleAddNote}
            />
          </div>
        </div>

        <AuditLogView
          logs={auditLogs}
          users={store.users}
          title="User Activity Log"
          emptyMessage="No audit entries for this user"
        />

        <AdminConfirmationDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
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
                <Select value={reviewAction} onValueChange={(val) => setReviewAction(val as any)}>
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
                    By verifying this ABN, the user will be able to post jobs on the platform.
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
