'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { safeRouterPush } from '@/lib/safe-nav';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plus,
  Search,
  Filter,
  Clock,
  Briefcase
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatCurrency, getTierBadgeColor, getTierDisplayName, getStatusBadgeColor, getStatusDisplayName, getPublicQuoteStatus } from '@/lib/tender-utils';
import { Tender, TenderStatus } from '@/lib/tender-types';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import { TenderRefineFilters, TenderFilters } from '@/components/tender-refine-filters';

export default function TendersPage() {
  const { currentUser, isLoading } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TenderStatus | 'all'>('all');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refineFilters, setRefineFilters] = useState<TenderFilters>({
    availableFrom: '',
    availableTo: '',
    distance: 15,
    minBudget: '',
    maxBudget: '',
    includeNoBudget: true,
    selectedTrades: [],
  });

  useEffect(() => {
    if (!isLoading) {
      fetchTenders();
    }
  }, [currentUser, isLoading]);

  const fetchTenders = async () => {
    if (isLoading) {
      return;
    }

    try {
      setLoading(true);
      const isBuilder = currentUser?.role === 'contractor' || currentUser?.role === 'admin';

      let query = supabase
        .from('tenders')
        .select(`
          *,
          tradeRequirements:tender_trade_requirements(*)
        `)
        .order('created_at', { ascending: false });

      if (currentUser && isBuilder) {
        query = query.eq('builder_id', currentUser.id);
      } else if (currentUser) {
        query = query
          .eq('approval_status', 'APPROVED')
          .eq('status', 'LIVE');
      } else {
        query = query
          .eq('approval_status', 'APPROVED')
          .eq('status', 'LIVE');
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mappedTenders: Tender[] = data.map((t: any) => ({
          id: t.id,
          builderId: t.builder_id,
          status: t.status,
          tier: t.tier,
          isNameHidden: t.is_name_hidden,
          projectName: t.project_name,
          projectDescription: t.project_description,
          suburb: t.suburb,
          postcode: t.postcode,
          lat: t.lat || 0,
          lng: t.lng || 0,
          desiredStartDate: t.desired_start_date,
          desiredEndDate: t.desired_end_date,
          budgetMinCents: t.budget_min_cents,
          budgetMaxCents: t.budget_max_cents,
          quoteCapTotal: t.quote_cap_total,
          quoteCountTotal: t.quote_count_total,
          limitedQuotesEnabled: t.limited_quotes_enabled,
          closesAt: t.closes_at,
          approvalStatus: t.approval_status,
          createdAt: t.created_at,
          updatedAt: t.updated_at || t.created_at,
          tradeRequirements: t.tradeRequirements?.map((tr: any) => ({
            id: tr.id,
            tenderId: tr.tender_id,
            trade: tr.trade,
            subDescription: tr.sub_description,
            budgetMinCents: tr.budget_min_cents,
            budgetMaxCents: tr.budget_max_cents,
            createdAt: tr.created_at,
            updatedAt: tr.updated_at,
          })),
        }));

        setTenders(mappedTenders);
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBuilder = currentUser?.role === 'contractor' || currentUser?.role === 'admin';
  const isMyTender = (tender: Tender) => currentUser && tender.builderId === currentUser.id;

  const tradeMatchesTender = (tender: Tender) => {
    if (!currentUser) return true;
    if (!tender.tradeRequirements || tender.tradeRequirements.length === 0) return false;
    return tender.tradeRequirements.some(req => req.trade === currentUser.primaryTrade);
  };

  const parseDateDDMMYYYY = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length !== 10) return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year || year < 2000 || year > 2100) return null;
    return new Date(year, month - 1, day);
  };

  const dateRangesOverlap = (
    tenderStart: string | null | undefined,
    tenderEnd: string | null | undefined,
    filterFrom: string,
    filterTo: string
  ): boolean => {
    if (!filterFrom && !filterTo) return true;
    if (!tenderStart && !tenderEnd) return true;

    const filterFromDate = filterFrom ? parseDateDDMMYYYY(filterFrom) : null;
    const filterToDate = filterTo ? parseDateDDMMYYYY(filterTo) : null;
    const tenderStartDate = tenderStart ? new Date(tenderStart) : null;
    const tenderEndDate = tenderEnd ? new Date(tenderEnd) : null;

    if (!tenderStartDate && !tenderEndDate) return true;
    if (!filterFromDate && !filterToDate) return true;

    const tStart = tenderStartDate?.getTime() || 0;
    const tEnd = tenderEndDate?.getTime() || Infinity;
    const fStart = filterFromDate?.getTime() || 0;
    const fEnd = filterToDate?.getTime() || Infinity;

    return tStart <= fEnd && tEnd >= fStart;
  };

  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tender.suburb.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || tender.status === selectedStatus;
    const matchesTrade = !currentUser || (isBuilder ? isMyTender(tender) : tradeMatchesTender(tender));

    const matchesDateRange = dateRangesOverlap(
      tender.desiredStartDate ? tender.desiredStartDate.toISOString() : null,
      tender.desiredEndDate ? tender.desiredEndDate.toISOString() : null,
      refineFilters.availableFrom,
      refineFilters.availableTo
    );

    const matchesBudget = (() => {
      const minFilter = refineFilters.minBudget ? parseInt(refineFilters.minBudget) * 100 : null;
      const maxFilter = refineFilters.maxBudget ? parseInt(refineFilters.maxBudget) * 100 : null;

      if (!tender.budgetMinCents && !tender.budgetMaxCents) {
        return refineFilters.includeNoBudget;
      }

      const tenderMin = tender.budgetMinCents || 0;
      const tenderMax = tender.budgetMaxCents || Infinity;

      if (minFilter && tenderMax < minFilter) return false;
      if (maxFilter && tenderMin > maxFilter) return false;

      return true;
    })();

    const matchesTradeFilter = (() => {
      if (refineFilters.selectedTrades.length === 0) return true;
      if (!tender.tradeRequirements || tender.tradeRequirements.length === 0) return false;
      return tender.tradeRequirements.some(req =>
        refineFilters.selectedTrades.includes(req.trade)
      );
    })();

    return matchesSearch && matchesStatus && matchesTrade && matchesDateRange && matchesBudget && matchesTradeFilter;
  });

  const canCreateTender = currentUser?.role === 'contractor' || currentUser?.role === 'admin';

  const dashboardHref = isBuilder ? '/dashboard/contractor' : '/dashboard/subcontractor';

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser ? (
          <PageHeader
            backLink={{ href: dashboardHref }}
            title={isBuilder ? 'My Tenders' : 'Available Tenders'}
            description={
              isBuilder
                ? 'Manage your project tenders and review quotes from contractors'
                : 'Browse project tenders and submit quotes'
            }
            action={
              canCreateTender ? (
                <Button onClick={() => router.push('/tenders/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tender
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Available Tenders</h1>
            <p className="text-gray-600">Sign in to view full details and submit quotes</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by project name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('all')}
              >
                All
              </Button>
              {isBuilder && (
                <>
                  <Button
                    variant={selectedStatus === 'DRAFT' ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus('DRAFT')}
                  >
                    Draft
                  </Button>
                </>
              )}
              <Button
                variant={selectedStatus === 'LIVE' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('LIVE')}
              >
                Live
              </Button>
              <Button
                variant={selectedStatus === 'CLOSED' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('CLOSED')}
              >
                Closed
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 block md:hidden">
          <TenderRefineFilters
            currentUser={currentUser}
            onFiltersChange={setRefineFilters}
            isMobile={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="hidden md:block lg:col-span-1">
            <TenderRefineFilters
              currentUser={currentUser}
              onFiltersChange={setRefineFilters}
              isMobile={false}
            />
          </div>

          <div className="lg:col-span-3">

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading tenders...
            </CardContent>
          </Card>
        ) : filteredTenders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              {(() => {
                const hasFilters = searchTerm ||
                  refineFilters.availableFrom ||
                  refineFilters.availableTo ||
                  refineFilters.minBudget ||
                  refineFilters.maxBudget ||
                  refineFilters.selectedTrades.length > 0;

                if (hasFilters && tenders.length > 0) {
                  return (
                    <EmptyState
                      icon={Filter}
                      title="No jobs match your filters"
                      description="Try widening your search radius, adjusting your budget range, or clearing some filters."
                      ctaLabel="Clear all filters"
                      onCtaClick={() => {
                        setSearchTerm('');
                        setSelectedStatus('all');
                        setRefineFilters({
                          availableFrom: '',
                          availableTo: '',
                          distance: 15,
                          minBudget: '',
                          maxBudget: '',
                          includeNoBudget: true,
                          selectedTrades: [],
                        });
                      }}
                    />
                  );
                }

                if (isBuilder) {
                  return (
                    <EmptyState
                      icon={Briefcase}
                      title="No tenders yet"
                      description="Create your first tender to start receiving quotes from qualified subcontractors."
                      ctaLabel={canCreateTender ? "Create Job Tender" : undefined}
                      onCtaClick={canCreateTender ? () => router.push('/tenders/create') : undefined}
                    />
                  );
                }

                return (
                  <EmptyState
                    icon={Briefcase}
                    title="No jobs available right now"
                    description="We show jobs within your preferred work area to keep opportunities relevant and reduce unnecessary travel. Jobs appear when contractors post work that matches your trade and location."
                    suggestions={[
                      "Consider widening your work radius in Settings",
                      "Set up availability alerts to get notified when new jobs are posted",
                      "Check back regularly as new tenders are posted daily"
                    ]}
                  />
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
            {filteredTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} isBuilder={isBuilder} currentUser={currentUser} />
            ))}
          </div>
        )}
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

function TenderCard({ tender, isBuilder, currentUser }: { tender: Tender; isBuilder: boolean; currentUser: any }) {
  const router = useRouter();

  const viewerTradeRequirement = currentUser ? tender.tradeRequirements?.find(
    (req) => req.trade === currentUser.primaryTrade
  ) : null;

  const tradesList = tender.tradeRequirements?.map(req => req.trade).join(', ') || '';

  const handleCardClick = () => {
    if (!currentUser) {
      safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login');
    } else {
      safeRouterPush(router, `/tenders/${tender.id}`, '/tenders');
    }
  };

  if (!currentUser) {
    const quoteStatus = getPublicQuoteStatus(tender.status, tender.quoteCapTotal ?? null, tender.quoteCountTotal);

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCardClick}>
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <Badge className={quoteStatus.color}>
              {quoteStatus.label}
            </Badge>
          </div>
          <CardTitle className="text-lg blur-sm select-none pointer-events-none">
            Project Details Hidden
          </CardTitle>
          <p className="text-sm text-gray-500 blur-sm select-none pointer-events-none">
            Description hidden - sign in to view
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{tender.suburb}{tender.postcode ? `, ${tender.postcode}` : ''}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Posted {formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}</span>
          </div>

          {tradesList && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Required trades:</div>
              <div className="text-sm text-gray-700 font-medium">{tradesList}</div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 space-y-2">
            <div className="text-xs text-gray-500 blur-sm select-none pointer-events-none">Budget range hidden</div>
            <div className="text-xs text-gray-500 blur-sm select-none pointer-events-none">Timeline hidden</div>
            <div className="text-xs text-gray-500 blur-sm select-none pointer-events-none">Documents hidden</div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <Button variant="outline" className="w-full" onClick={(e) => {e.stopPropagation(); safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login');}}>
              Sign in to view details & quote
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={getTierBadgeColor(tender.tier)}>
            {getTierDisplayName(tender.tier)}
          </Badge>
          <Badge className={getStatusBadgeColor(tender.status)}>
            {getStatusDisplayName(tender.status)}
          </Badge>
        </div>
        <CardTitle className="text-lg">{tender.projectName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tender.projectDescription && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {tender.projectDescription}
          </p>
        )}

        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{tender.suburb}, {tender.postcode}</span>
        </div>

        {tender.desiredStartDate && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              Starts: {new Date(tender.desiredStartDate).toLocaleDateString('en-AU')}
            </span>
          </div>
        )}

        {(tender.budgetMinCents || tender.budgetMaxCents) && (
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              {tender.budgetMinCents && tender.budgetMaxCents
                ? `${formatCurrency(tender.budgetMinCents)} - ${formatCurrency(tender.budgetMaxCents)}`
                : tender.budgetMinCents
                ? `From ${formatCurrency(tender.budgetMinCents)}`
                : `Up to ${formatCurrency(tender.budgetMaxCents!)}`
              }
            </span>
          </div>
        )}

        {tradesList && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Needs quotes from:</div>
            <div className="text-sm text-gray-700">{tradesList}</div>
          </div>
        )}

        {!isBuilder && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Your trade scope:</div>
            <p className="text-sm text-gray-700 line-clamp-1 sm:line-clamp-2">
              {viewerTradeRequirement?.subDescription || 'Your trade scope details are not available for this tender.'}
            </p>
          </div>
        )}

        {isBuilder && tender.status === 'LIVE' && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2" />
              <span>{tender.quoteCountTotal} quote{tender.quoteCountTotal !== 1 ? 's' : ''}</span>
            </div>
            {tender.quoteCapTotal && (
              <span className="text-xs text-gray-500">
                Max: {tender.quoteCapTotal}
              </span>
            )}
          </div>
        )}

        {!isBuilder && tender.quoteCapTotal && tender.quoteCountTotal >= tender.quoteCapTotal && (
          <div className="pt-2 border-t border-gray-200">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Quote limit reached
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
