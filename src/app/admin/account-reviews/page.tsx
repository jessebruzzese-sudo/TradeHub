'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { AlertCircle, CheckCircle, Flag, User, Mail, Briefcase, MapPin, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

type ReviewStatus = 'pending' | 'reviewed' | 'flagged' | 'suspended';
type FilterStatus = 'all' | 'pending' | 'reviewed' | 'flagged' | 'suspended';

type ReviewUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  primary_trade: string | null;
  business_name: string | null;
  abn: string | null;
  location: string | null;
  postcode: string | null;
  created_at: string | null;
} | null;

interface AccountReview {
  id: string;
  user_id: string;
  status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  flag_reason: string | null;
  notes: string | null;
  created_at: string;
  user: ReviewUser; // ✅ allow null
}

export default function AccountReviewsPage() {
  const { currentUser, isLoading } = useAuth();
  const supabase = getBrowserSupabase();

  const [reviews, setReviews] = useState<AccountReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');

  const [selectedReview, setSelectedReview] = useState<AccountReview | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [action, setAction] = useState<ReviewStatus>('reviewed');
  const [notes, setNotes] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdminUser = isAdmin(currentUser);

  const loadReviews = useCallback(async () => {
    if (!isAdminUser) return;

    setLoading(true);
    try {
      let query = supabase
        .from('admin_account_reviews')
        .select(
          `
          id,
          user_id,
          status,
          reviewed_by,
          reviewed_at,
          flag_reason,
          notes,
          created_at,
          user:users!admin_account_reviews_user_id_fkey (
            id,
            name,
            email,
            role,
            primary_trade,
            business_name,
            abn,
            location,
            postcode,
            created_at
          )
        `
        )
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReviews((data || []) as AccountReview[]);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load account reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filter, isAdminUser]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdminUser) return;
    loadReviews();
  }, [isLoading, isAdminUser, loadReviews]);

  const handleOpenActionDialog = (review: AccountReview) => {
    setSelectedReview(review);
    setAction('reviewed');
    setNotes('');
    setFlagReason('');
    setShowActionDialog(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedReview || !currentUser) return;

    setSaving(true);
    try {
      const updateData: any = {
        status: action,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
        flag_reason: null,
      };

      if (action === 'flagged' || action === 'suspended') {
        if (!flagReason.trim()) {
          toast.error('Please provide a reason for this action');
          setSaving(false);
          return;
        }
        updateData.flag_reason = flagReason.trim();
      }

      const { error } = await supabase
        .from('admin_account_reviews')
        .update(updateData)
        .eq('id', selectedReview.id);

      if (error) throw error;

      // Optional: only run if the column exists in your schema
      // If this errors, remove it.
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ account_reviewed: true })
        .eq('id', selectedReview.user_id);

      if (userUpdateError) {
        console.warn('[AccountReviews] users.account_reviewed update failed:', userUpdateError);
      }

      toast.success('Review action completed');
      setShowActionDialog(false);
      setSelectedReview(null);
      await loadReviews();
    } catch (error) {
      console.error('Error submitting action:', error);
      toast.error('Failed to submit action');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: ReviewStatus) => {
    const variants: Record<ReviewStatus, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: AlertCircle, label: 'Pending Review' },
      reviewed: { variant: 'default', icon: CheckCircle, label: 'Reviewed' },
      flagged: { variant: 'destructive', icon: Flag, label: 'Flagged' },
      suspended: { variant: 'destructive', icon: Shield, label: 'Suspended' },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const safeName = (review: AccountReview) => review.user?.name || 'Unknown user';
  const safeEmail = (review: AccountReview) => review.user?.email || '—';

  const safeCreatedDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  };

  if (isLoading) return null;

  if (!isAdminUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <PageHeader
        title="Account Reviews"
        description="Review new accounts for potential scams or misconduct"
      />

      <div className="mb-6 flex gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All
        </Button>
        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>
          Pending
        </Button>
        <Button variant={filter === 'reviewed' ? 'default' : 'outline'} onClick={() => setFilter('reviewed')}>
          Reviewed
        </Button>
        <Button variant={filter === 'flagged' ? 'default' : 'outline'} onClick={() => setFilter('flagged')}>
          Flagged
        </Button>
        <Button variant={filter === 'suspended' ? 'default' : 'outline'} onClick={() => setFilter('suspended')}>
          Suspended
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No account reviews found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{safeName(review)}</h3>
                    <p className="text-sm text-gray-500">
                      Created {safeCreatedDate(review.user?.created_at)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(review.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {safeEmail(review)}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  {(review.user?.role || '—')}{' '}
                  - {review.user?.primary_trade || 'No trade set'}
                </div>

                {review.user?.business_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4" />
                    {review.user.business_name}
                  </div>
                )}

                {review.user?.abn && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    ABN: {review.user.abn}
                  </div>
                )}

                {review.user?.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {review.user.location}
                    {review.user.postcode ? `, ${review.user.postcode}` : ''}
                  </div>
                )}

                {!review.user && (
                  <div className="text-sm text-gray-500">
                    This review references a user that no longer exists or is not readable (RLS).
                  </div>
                )}
              </div>

              {review.flag_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-1">Flag Reason:</p>
                  <p className="text-sm text-red-700">{review.flag_reason}</p>
                </div>
              )}

              {review.notes && (
                <div className="bg-gray-50 rounded p-3 mb-4">
                  <p className="text-sm font-medium text-gray-800 mb-1">Admin Notes:</p>
                  <p className="text-sm text-gray-600">{review.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/users/${review.user_id}`}>View Full Profile</Link>
                </Button>

                {review.status === 'pending' && (
                  <Button size="sm" onClick={() => handleOpenActionDialog(review)}>
                    Take Action
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Account</DialogTitle>
            <DialogDescription>
              Take action on {selectedReview ? safeName(selectedReview) : 'this account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={action} onValueChange={(val) => setAction(val as ReviewStatus)}>
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

            {(action === 'flagged' || action === 'suspended') && (
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAction} disabled={saving}>
              {saving ? 'Saving...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
