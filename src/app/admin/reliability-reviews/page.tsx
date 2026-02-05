'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { AdminReviewCase, AdminReviewStatus } from '@/lib/types';
import Link from 'next/link';

export default function ReliabilityReviewsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'pending' | 'in_review' | 'resolved'>('pending');

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  const mockReviewCases: (AdminReviewCase & { subcontractorName: string; subcontractorTrade: string })[] = [
    {
      id: 'case-1',
      subcontractorId: 'user-2',
      subcontractorName: 'Sam Clarke',
      subcontractorTrade: 'Electrician',
      reason: 'RELIABILITY',
      status: 'PENDING',
      reliabilityEventCount: 3,
      createdAt: new Date('2025-12-29'),
      updatedAt: new Date('2025-12-29'),
    },
    {
      id: 'case-2',
      subcontractorId: 'user-4',
      subcontractorName: 'Taylor Brown',
      subcontractorTrade: 'Plumber',
      reason: 'RELIABILITY',
      status: 'IN_REVIEW',
      reliabilityEventCount: 4,
      createdAt: new Date('2025-12-28'),
      reviewedBy: currentUser.id,
      updatedAt: new Date('2025-12-30'),
    },
  ];

  const getStatusIcon = (status: AdminReviewStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'IN_REVIEW':
        return <Eye className="w-4 h-4" />;
      case 'CLEARED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'WARNING_ISSUED':
        return <AlertCircle className="w-4 h-4" />;
      case 'SUSPENDED':
        return <Ban className="w-4 h-4" />;
      case 'PERMANENTLY_BANNED':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AdminReviewStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'CLEARED':
        return 'bg-green-100 text-green-800';
      case 'WARNING_ISSUED':
        return 'bg-orange-100 text-orange-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'PERMANENTLY_BANNED':
        return 'bg-gray-900 text-white';
    }
  };

  const filteredCases = mockReviewCases.filter((c) => {
    if (activeTab === 'pending') return c.status === 'PENDING';
    if (activeTab === 'in_review') return c.status === 'IN_REVIEW';
    return ['CLEARED', 'WARNING_ISSUED', 'SUSPENDED', 'PERMANENTLY_BANNED'].includes(c.status);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reliability Reviews</h1>
        <p className="text-gray-600">
          Review and manage subcontractor accounts flagged for reliability issues
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockReviewCases.filter((c) => c.status === 'PENDING').length}
            </div>
            <p className="text-xs text-gray-500">Awaiting admin action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockReviewCases.filter((c) => c.status === 'IN_REVIEW').length}
            </div>
            <p className="text-xs text-gray-500">Currently under review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved (30 days)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockReviewCases.filter((c) => ['CLEARED', 'WARNING_ISSUED', 'SUSPENDED'].includes(c.status)).length}
            </div>
            <p className="text-xs text-gray-500">Actions taken</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
          <CardDescription>
            Cases are automatically created when subcontractors reach 3 non-fulfillments in 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_review">In Review</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredCases.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No cases found</p>
                  <p className="text-sm">
                    {activeTab === 'pending' && 'No cases are pending review'}
                    {activeTab === 'in_review' && 'No cases are currently in review'}
                    {activeTab === 'resolved' && 'No cases have been resolved recently'}
                  </p>
                </div>
              ) : (
                filteredCases.map((reviewCase) => (
                  <Card key={reviewCase.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{reviewCase.subcontractorName}</h3>
                            <Badge variant="outline">{reviewCase.subcontractorTrade}</Badge>
                            <Badge className={getStatusColor(reviewCase.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(reviewCase.status)}
                                {reviewCase.status.replace(/_/g, ' ')}
                              </span>
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-gray-500">Reason:</span>
                              <span className="ml-2 font-medium">{reviewCase.reason}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Non-fulfillments (90 days):</span>
                              <span className="ml-2 font-medium text-red-600">
                                {reviewCase.reliabilityEventCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Case created:</span>
                              <span className="ml-2 font-medium">
                                {reviewCase.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                            {reviewCase.reviewedAt && (
                              <div>
                                <span className="text-gray-500">Reviewed:</span>
                                <span className="ml-2 font-medium">
                                  {reviewCase.reviewedAt.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {reviewCase.resolutionNotes && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                              <p className="font-medium text-gray-700 mb-1">Resolution Notes:</p>
                              <p className="text-gray-600">{reviewCase.resolutionNotes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link href={`/admin/reliability-reviews/${reviewCase.id}`}>
                            <Button size="sm" variant="outline" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              Review Case
                            </Button>
                          </Link>
                          <Link href={`/admin/users/${reviewCase.subcontractorId}`}>
                            <Button size="sm" variant="ghost" className="w-full">
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
