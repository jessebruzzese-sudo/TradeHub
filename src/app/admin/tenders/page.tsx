'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { useRouter } from 'next/navigation';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserSupabase } from '@/lib/supabase-client';

interface TenderForReview {
  id: string;
  projectName: string;
  builderName: string;
  suburb: string;
  approvalStatus: string;
  trades: string[];
  createdAt: string;
  builderId: string;
}

export default function AdminTendersPage() {
  const { currentUser } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const [selectedTender, setSelectedTender] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [tenders, setTenders] = useState<TenderForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchTenders = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tenders')
        .select(`
          id,
          project_name,
          suburb,
          approval_status,
          created_at,
          builder_id,
          builder:users!tenders_builder_id_fkey(name),
          tradeRequirements:tender_trade_requirements(trade)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedTenders: TenderForReview[] = data.map((t: any) => ({
          id: t.id,
          projectName: t.project_name,
          builderName: t.builder?.name || 'Unknown Builder',
          suburb: t.suburb,
          approvalStatus: t.approval_status,
          trades: t.tradeRequirements?.map((tr: any) => tr.trade) || [],
          createdAt: t.created_at,
          builderId: t.builder_id,
        }));

        setTenders(mappedTenders);
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
      toast.error('Failed to load tenders');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentUser && isAdmin(currentUser)) {
      fetchTenders();
    }
  }, [currentUser, fetchTenders]);

  const handleApprove = async (tenderId: string) => {
    setSubmitting(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from('tenders')
        .update({
          approval_status: 'APPROVED',
          approved_by: currentUser!.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          status: 'LIVE',
        })
        .eq('id', tenderId);

      if (updateError) throw updateError;

      const { error: auditError } = await (supabase as any)
        .from('audit_logs')
        .insert({
          admin_id: currentUser!.id,
          action_type: 'tender_approved',
          target_tender_id: tenderId,
          details: `Tender approved${adminNotes ? ` with notes: ${adminNotes}` : ''}`,
          created_at: new Date().toISOString(),
        });

      if (auditError) console.error('Audit log error:', auditError);

      toast.success('Tender approved successfully');
      setSelectedTender(null);
      setAdminNotes('');
      fetchTenders();
    } catch (err) {
      console.error('Error approving tender:', err);
      toast.error('Failed to approve tender');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (tenderId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from('tenders')
        .update({
          approval_status: 'REJECTED',
          approved_by: currentUser!.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
        })
        .eq('id', tenderId);

      if (updateError) throw updateError;

      const { error: auditError } = await (supabase as any)
        .from('audit_logs')
        .insert({
          admin_id: currentUser!.id,
          action_type: 'tender_rejected',
          target_tender_id: tenderId,
          details: `Tender rejected: ${rejectionReason}`,
          created_at: new Date().toISOString(),
        });

      if (auditError) console.error('Audit log error:', auditError);

      toast.success('Tender rejected');
      setSelectedTender(null);
      setRejectionReason('');
      setAdminNotes('');
      fetchTenders();
    } catch (err) {
      console.error('Error rejecting tender:', err);
      toast.error('Failed to reject tender');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingTenders = tenders.filter((t) => t.approvalStatus === 'PENDING');
  const approvedTenders = tenders.filter((t) => t.approvalStatus === 'APPROVED');
  const rejectedTenders = tenders.filter((t) => t.approvalStatus === 'REJECTED');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tender Moderation</h1>
          <p className="text-gray-600">Review and approve tenders before they go live</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingTenders.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedTenders.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedTenders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Loading tenders...
                </CardContent>
              </Card>
            ) : pendingTenders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No pending tenders to review
                </CardContent>
              </Card>
            ) : (
              pendingTenders.map((tender) => (
                <Card key={tender.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{tender.projectName}</CardTitle>
                        <CardDescription>
                          Builder: {tender.builderName} • {tender.suburb}
                          <br />
                          Trades: {tender.trades.join(', ')}
                        </CardDescription>
                      </div>
                      {getStatusBadge(tender.approvalStatus)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedTender === tender.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                          <Textarea
                            id="adminNotes"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Internal notes about this tender..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="rejectionReason">
                            Rejection Reason (Required if rejecting)
                          </Label>
                          <Textarea
                            id="rejectionReason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(tender.id)}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={submitting}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {submitting ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => handleReject(tender.id)}
                            variant="destructive"
                            disabled={submitting}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {submitting ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTender(null);
                              setAdminNotes('');
                              setRejectionReason('');
                            }}
                            variant="outline"
                            disabled={submitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push(`/tenders/${tender.id}`)}
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button onClick={() => setSelectedTender(tender.id)}>
                          Review
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedTenders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No approved tenders yet
                </CardContent>
              </Card>
            ) : (
              approvedTenders.map((tender) => (
                <Card key={tender.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{tender.projectName}</CardTitle>
                        <CardDescription>
                          Builder: {tender.builderName} • {tender.suburb}
                        </CardDescription>
                      </div>
                      {getStatusBadge(tender.approvalStatus)}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedTenders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No rejected tenders
                </CardContent>
              </Card>
            ) : (
              rejectedTenders.map((tender) => (
                <Card key={tender.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{tender.projectName}</CardTitle>
                        <CardDescription>
                          Builder: {tender.builderName} • {tender.suburb}
                        </CardDescription>
                      </div>
                      {getStatusBadge(tender.approvalStatus)}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
