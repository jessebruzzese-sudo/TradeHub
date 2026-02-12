'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ArrowLeft, AlertCircle, CheckCircle2, Ban, XCircle, Inbox, Clock } from 'lucide-react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

interface ReviewCaseDetail {
  id: string;
  subcontractorId: string;
  subcontractorName: string;
  subcontractorEmail: string;
  subcontractorTrade: string;
  subcontractorPlan: string;
  subcontractorRating: number;
  reason: string;
  status: string;
  reliabilityEventCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ReliabilityEvent {
  id: string;
  jobTitle: string;
  eventType: string;
  eventDate: Date;
  contractorName: string;
  contractorNotes: string;
}

export default function ReliabilityReviewDetailPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [action, setAction] = useState<'no_action' | 'warning' | 'suspend' | 'permanent_ban'>('no_action');
  const [suspensionDays, setSuspensionDays] = useState('7');
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reviewCase, setReviewCase] = useState<ReviewCaseDetail | null>(null);
  const [reliabilityEvents, setReliabilityEvents] = useState<ReliabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReviewCase() {
      try {
        const supabase = getBrowserSupabase();

        // Fetch the review case
        const { data: rawCaseData, error: caseError } = await supabase
          .from('admin_review_cases')
          .select('*')
          .eq('id', caseId)
          .single();

        if (caseError || !rawCaseData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const caseData: any = rawCaseData;
        setReviewCase({
          id: caseData.id,
          subcontractorId: caseData.subcontractor_id,
          subcontractorName: caseData.subcontractor_name ?? 'Unknown',
          subcontractorEmail: caseData.subcontractor_email ?? '',
          subcontractorTrade: caseData.subcontractor_trade ?? 'Unknown',
          subcontractorPlan: caseData.subcontractor_plan ?? 'N/A',
          subcontractorRating: caseData.subcontractor_rating ?? 0,
          reason: caseData.reason,
          status: caseData.status,
          reliabilityEventCount: caseData.reliability_event_count ?? 0,
          createdAt: new Date(caseData.created_at),
          updatedAt: new Date(caseData.updated_at),
        });

        // Fetch associated reliability events
        const { data: eventsData } = await supabase
          .from('reliability_events')
          .select('*')
          .eq('review_case_id', caseId)
          .order('event_date', { ascending: false });

        if (eventsData && eventsData.length > 0) {
          setReliabilityEvents(
            eventsData.map((ev: any) => ({
              id: ev.id,
              jobTitle: ev.job_title ?? 'Untitled Job',
              eventType: ev.event_type,
              eventDate: new Date(ev.event_date),
              contractorName: ev.contractor_name ?? 'Unknown',
              contractorNotes: ev.contractor_notes ?? '',
            }))
          );
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchReviewCase();
  }, [caseId]);

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center py-16 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
          <p className="text-lg font-medium">Loading review case...</p>
        </div>
      </div>
    );
  }

  if (notFound || !reviewCase) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link href="/admin/reliability-reviews">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </Button>
          </Link>
        </div>
        <div className="text-center py-16 text-gray-500">
          <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Review case not found
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This reliability review case does not exist or has not been created yet.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    try {
      const supabase = getBrowserSupabase();
      const statusMap = {
        no_action: 'CLEARED',
        warning: 'WARNING_ISSUED',
        suspend: 'SUSPENDED',
        permanent_ban: 'PERMANENTLY_BANNED',
      } as const;

      await supabase
        .from('admin_review_cases')
        .update({
          status: statusMap[action],
          reviewed_by: currentUser!.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: notes,
          suspension_days: action === 'suspend' ? parseInt(suspensionDays) : null,
        })
        .eq('id', reviewCase.id);
    } catch (err) {
      console.error('Failed to resolve case:', err);
    }

    router.push('/admin/reliability-reviews');
  };

  const getActionDescription = () => {
    switch (action) {
      case 'no_action':
        return 'Mark the case as reviewed with no action taken. The subcontractor will be notified.';
      case 'warning':
        return 'Issue a reliability warning. The subcontractor will be notified to improve their fulfillment rate.';
      case 'suspend':
        return `Temporarily suspend the account for ${suspensionDays} days. The subcontractor will not be able to apply for jobs during this period.`;
      case 'permanent_ban':
        return 'Permanently ban the subcontractor from the platform. This action cannot be undone.';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/reliability-reviews">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reviews
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{reviewCase.subcontractorName}</CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reviewCase.subcontractorTrade}</Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {reviewCase.subcontractorPlan}
                    </Badge>
                  </div>
                  <p className="text-sm">{reviewCase.subcontractorEmail}</p>
                  <p className="text-sm">Rating: {reviewCase.subcontractorRating}/5.0</p>
                </CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-800">
                {reviewCase.reliabilityEventCount} Non-fulfillments (90 days)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Case Created:</span>
                <span className="font-medium">{reviewCase.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reason:</span>
                <span className="font-medium">{reviewCase.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge>{reviewCase.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reliability Events</CardTitle>
            <CardDescription>
              Non-fulfillments in the last 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reliabilityEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No reliability events recorded for this case.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reliabilityEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-red-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{event.jobTitle}</p>
                        <p className="text-sm text-gray-600">
                          {event.eventDate.toLocaleDateString()} • {event.contractorName}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {event.eventType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm bg-gray-50 p-3 rounded">
                      {event.contractorNotes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Action</CardTitle>
            <CardDescription>
              Choose an action to resolve this case
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Action</Label>
              <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="no_action" id="no-action" />
                  <Label htmlFor="no-action" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Mark as Reviewed – No Action</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Case reviewed, no action required at this time
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="warning" id="warning" />
                  <Label htmlFor="warning" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">Issue Reliability Warning</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Send a formal warning about reliability issues
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="suspend" id="suspend" />
                  <Label htmlFor="suspend" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Temporarily Suspend</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Suspend account for a specified period
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="permanent_ban" id="permanent-ban" />
                  <Label htmlFor="permanent-ban" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-gray-900" />
                      <span className="font-medium">Permanently Ban</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Permanently remove from platform (cannot be undone)
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {action === 'suspend' && (
              <div className="space-y-2">
                <Label htmlFor="suspension-days">Suspension Duration</Label>
                <Select value={suspensionDays} onValueChange={setSuspensionDays}>
                  <SelectTrigger id="suspension-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes (required)</Label>
              <Textarea
                id="notes"
                placeholder="Explain your decision and any context for this action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Action Summary:</strong> {getActionDescription()}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!notes.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit Decision
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
              <br /><br />
              The subcontractor will be notified of this decision. This action will be logged in the audit trail.
              {action === 'permanent_ban' && (
                <p className="text-red-600 font-semibold mt-2">
                  Warning: Permanent bans cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
