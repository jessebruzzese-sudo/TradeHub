'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, MapPin, Clock, Plus, Briefcase } from 'lucide-react';
import { getPublicQuoteStatus } from '@/lib/tender-utils';
import { Tender } from '@/lib/tender-types';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import { formatSuburbForDisplay } from '@/lib/slug-utils';

interface TradeSuburbTendersProps {
  trade: string;
  suburb: string;
}

export default function TradeSuburbTenders({ trade, suburb }: TradeSuburbTendersProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabase();

  const fetchTenders = useCallback(async () => {
    if (isLoading) {
      return;
    }

    try {
      setLoading(true);

      const suburbNormalized = suburb.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

      let query = supabase
        .from('tenders')
        .select(`
          *,
          tradeRequirements:tender_trade_requirements(*)
        `)
        .eq('approval_status', 'APPROVED')
        .eq('status', 'LIVE')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mappedTenders: Tender[] = data
          .map((t: any) => ({
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
          }))
          .filter((tender: any) => {
            const tenderSuburb = tender.suburb.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            const hasTrade = tender.tradeRequirements?.some((req: any) => req.trade === trade);
            const matchesSuburb = tenderSuburb.includes(suburbNormalized) || suburbNormalized.includes(tenderSuburb);

            return hasTrade && matchesSuburb;
          });

        setTenders(mappedTenders);
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, trade, suburb, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      fetchTenders();
    }
  }, [trade, suburb, isLoading, fetchTenders]);

  const displaySuburb = formatSuburbForDisplay(suburb);
  // Role used for UI/copy only, not permissions
  const isBuilder = currentUser?.role === 'contractor' || currentUser?.role === 'admin';

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/tenders"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            ← Back to all tenders
          </Link>

          {currentUser ? (
            <PageHeader
              backLink={{ href: '/tenders' }}
              title={`${trade} Work in ${displaySuburb}`}
              description={`Browse available ${trade.toLowerCase()} tenders in ${displaySuburb}`}
            />
          ) : (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {trade} Work in {displaySuburb}
              </h1>
              <p className="text-gray-600">
                Browse available {trade.toLowerCase()} tenders in {displaySuburb}. Sign in to view full details and submit quotes.
              </p>
            </div>
          )}

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Loading tenders...
              </CardContent>
            </Card>
          ) : tenders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tenders available
                  </h3>
                  <p className="text-gray-600 mb-6">
                    There are currently no {trade.toLowerCase()} tenders in {displaySuburb}.
                    {!currentUser && ' Sign in to get notified when new tenders are posted.'}
                  </p>
                  {!currentUser && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => router.push('/login')}>
                        Sign in
                      </Button>
                      <Button variant="outline" onClick={() => router.push('/signup')}>
                        Create account
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} currentUser={currentUser} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function TenderCard({ tender, currentUser }: { tender: Tender; currentUser: any }) {
  const router = useRouter();
  const tradesList = tender.tradeRequirements?.map(req => req.trade).join(', ') || '';
  const quoteStatus = getPublicQuoteStatus(tender.status, tender.quoteCapTotal ?? null, tender.quoteCountTotal);

  const handleCardClick = () => {
    if (!currentUser) {
      router.push(`/login?returnUrl=/tenders/${tender.id}`);
    } else {
      router.push(`/tenders/${tender.id}`);
    }
  };

  if (!currentUser) {
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
            <Button variant="outline" className="w-full" onClick={(e) => {e.stopPropagation(); router.push(`/login?returnUrl=/tenders/${tender.id}`);}}>
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
          <Badge className={quoteStatus.color}>
            {quoteStatus.label}
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

        <div className="flex items-center text-sm text-gray-500">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>Posted {formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}</span>
        </div>

        {tradesList && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Required trades:</div>
            <div className="text-sm text-gray-700">{tradesList}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
