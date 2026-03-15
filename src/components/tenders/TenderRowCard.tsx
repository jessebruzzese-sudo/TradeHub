'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileAvatar } from '@/components/profile-avatar';
import { hasValidABN } from '@/lib/abn-utils';
import {
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Tag,
  Star,
  XCircle,
  BadgeCheck,
  Trash2,
  RotateCcw,
} from 'lucide-react';

export type TenderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'LIVE' | 'CLOSED' | string;

export type TenderRowData = {
  id: string;
  builder_id: string;
  status: TenderStatus;
  tier: string | null;
  is_anonymous: boolean | null;
  is_name_hidden: boolean | null;
  project_name: string;
  project_description: string | null;
  suburb: string | null;
  postcode: string | null;
  created_at?: string | null;
  desired_start_date?: string | null;
  desired_end_date?: string | null;
  poster?: any;
  distance_km?: number | null;
  quotes_received?: number;
  quote_request_status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
};

export type BuilderMap = Record<
  string,
  {
    id: string;
    name: string | null;
    business_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    rating_count: number | null;
    abn_status: string | null;
    abn_verified_at: string | null;
    is_premium: boolean | null;
  }
>;

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function prettyTier(tier?: string | null) {
  const t = String(tier || '').toUpperCase();
  if (!t) return null;
  if (t === 'FREE_TRIAL') return 'Free Trial';
  return t.replaceAll('_', ' ');
}

function priceBandLabelFromCents(maxCents?: number | null) {
  if (!maxCents || maxCents <= 0) return null;
  const dollars = Math.ceil(maxCents / 100);
  const bands = [5000, 10000, 25000, 50000, 100000];
  for (const b of bands) {
    if (dollars <= b) return `Up to $${formatMoney(b)}`;
  }
  return '$100,000+';
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return null;
  try {
    if (start && !end) return new Date(start).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    if (start && end) {
      const s = new Date(start).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      const e = new Date(end).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${s} – ${e}`;
    }
    if (end) return new Date(end).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {}
  return null;
}

function statusVariant(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'default';
  if (s === 'PENDING_APPROVAL') return 'secondary';
  if (s === 'DRAFT') return 'secondary';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'outline';
  return 'outline';
}

function prettyStatus(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'Live';
  if (s === 'PENDING_APPROVAL') return 'Pending approval';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'CLOSED') return 'Closed';
  if (s === 'CANCELLED') return 'Cancelled';
  return s || 'Unknown';
}

function isBuilderVerified(t: any, builders: BuilderMap): boolean {
  if (t?.is_name_hidden) return false;
  const b = builders?.[t?.builder_id];
  return hasValidABN(b);
}

function getPosterNameFromRow(t: any, builders: BuilderMap): string {
  if (t?.is_name_hidden) return 'Builder (hidden)';
  const b = builders?.[t?.builder_id];
  return b?.business_name ?? b?.name ?? 'Builder';
}

function getPosterAvatarFromBuilders(t: any, builders: BuilderMap): string | undefined {
  if (t?.is_name_hidden) return undefined;
  const b = builders?.[t?.builder_id];
  return b?.avatar_url ?? undefined;
}

function getPosterRatingFromBuilders(t: any, builders: BuilderMap): { rating: number | null; count: number | null } {
  if (t?.is_name_hidden) return { rating: null, count: null };
  const b = builders?.[t?.builder_id];
  const rating = b?.rating != null ? Number(b.rating) : null;
  const count = b?.rating_count != null ? Number(b.rating_count) : null;
  return {
    rating: Number.isFinite(rating as number) ? rating : null,
    count: Number.isFinite(count as number) ? count : null,
  };
}

export interface TenderRowCardProps {
  tender: TenderRowData;
  showActions?: boolean;
  onDeleteClick?: (id: string) => void;
  onCloseClick?: (id: string) => void;
  onReopenClick?: (id: string) => void;
  onRequestToQuote?: (id: string) => void;
  budgetCents?: number | null;
  quotesReceived?: number;
  isClosing?: boolean;
  isPremium?: boolean;
  reopeningId?: string | null;
  isBusy?: boolean;
  isRequesting?: boolean;
  builders?: BuilderMap;
}

export function TenderRowCard({
  tender,
  showActions = false,
  onDeleteClick,
  onCloseClick,
  onReopenClick,
  onRequestToQuote,
  budgetCents,
  quotesReceived,
  isClosing,
  isPremium,
  reopeningId,
  isBusy,
  isRequesting,
  builders,
}: TenderRowCardProps) {
  const tierLabel = prettyTier(tender.tier);
  const priceLabel = priceBandLabelFromCents(budgetCents ?? null);
  const dateLabel = formatDateRange(tender.desired_start_date, tender.desired_end_date);
  const buildersMap = builders ?? {};
  const posterName = getPosterNameFromRow(tender, buildersMap);
  const posterAvatar = getPosterAvatarFromBuilders(tender, buildersMap);
  const { rating, count } = getPosterRatingFromBuilders(tender, buildersMap);
  const isOpen = ['PUBLISHED', 'LIVE'].includes(String(tender.status || '').toUpperCase());
  const isClosed = ['CLOSED', 'CANCELLED'].includes(String(tender.status || '').toUpperCase());
  const isClosedOnly = String(tender.status || '').toUpperCase() === 'CLOSED';
  const isDraft = String(tender.status || '').toUpperCase() === 'DRAFT';
  const isLive = isOpen;

  return (
    <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <Link
          href={`/tenders/${tender.id}`}
          className="block rounded-lg px-4 py-4 hover:bg-white/60"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* LEFT: title + trade/tier + poster */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-base font-semibold text-slate-900">
                  {tender.project_name}
                </div>
                {String(tender.status || '').toUpperCase() === 'CANCELLED' ? (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    {prettyStatus(tender.status)}
                  </Badge>
                ) : (
                  <Badge variant={statusVariant(tender.status) as 'default' | 'secondary' | 'outline'}>{prettyStatus(tender.status)}</Badge>
                )}
                {tierLabel && tierLabel !== 'Free Trial' ? (
                  <Badge variant="secondary" className="gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {tierLabel}
                  </Badge>
                ) : null}
                {priceLabel ? (
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    {priceLabel}
                  </Badge>
                ) : null}
                {showActions && typeof quotesReceived === 'number' && isLive ? (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    {quotesReceived === 1 ? '1 quote' : `${quotesReceived} quotes`}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {tender.is_anonymous ? (
                  showActions ? (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Posted anonymously</div>
                    </div>
                  ) : tender.quote_request_status === 'ACCEPTED' ? (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request accepted</div>
                      <Button
                        asChild
                        size="sm"
                        className="h-8"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/tenders/${tender.id}#quotes`}>Submit quote</Link>
                      </Button>
                    </div>
                  ) : tender.quote_request_status ? (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request sent</div>
                      <Button size="sm" variant="secondary" disabled className="h-8">
                        Request sent
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request to quote</div>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={!!isRequesting}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRequestToQuote?.(tender.id);
                        }}
                      >
                        {isRequesting ? 'Sending...' : 'Request'}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <ProfileAvatar
                      userId={tender.builder_id}
                      currentAvatarUrl={posterAvatar}
                      userName={posterName}
                      onAvatarUpdate={() => {}}
                      editable={false}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-sm font-medium text-slate-700">
                          {posterName}
                        </div>
                        {isBuilderVerified(tender, buildersMap) ? (
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 gap-1"
                          >
                            <BadgeCheck className="h-3.5 w-3.5 text-sky-600" />
                            Verified
                          </Badge>
                        ) : null}
                      </div>
                      {rating != null ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-medium text-slate-600">{rating.toFixed(1)}</span>
                          {count != null ? <span className="text-slate-400">({count})</span> : null}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">New</div>
                      )}
                      {!showActions && (tender.quote_request_status === 'ACCEPTED' ? (
                        <Button
                          asChild
                          size="sm"
                          className="h-7 mt-1"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/tenders/${tender.id}#quotes`}>Submit quote</Link>
                        </Button>
                      ) : tender.quote_request_status ? (
                        <Button size="sm" variant="secondary" disabled className="h-7 mt-1">
                          Request sent
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 mt-1"
                          disabled={!!isRequesting}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRequestToQuote?.(tender.id);
                          }}
                        >
                          {isRequesting ? 'Sending...' : 'Request'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE: description */}
            <div className="min-w-0 sm:flex-1">
              {tender.project_description ? (
                <div className="truncate text-sm text-slate-600">
                  {tender.project_description}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No description</div>
              )}
            </div>

            {/* RIGHT: meta icons + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {(tender.suburb || tender.postcode) ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-sky-600" />
                    <span>{[tender.suburb, tender.postcode].filter(Boolean).join(', ')}</span>
                  </div>
                ) : null}
                {dateLabel ? (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span>{dateLabel}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {showActions ? (
                  <>
                    {isLive && (quotesReceived ?? 0) >= 1 ? (
                      <Button asChild variant="secondary" size="sm" className="h-9">
                        <Link href={`/tenders/${tender.id}#quotes`}>View quotes</Link>
                      </Button>
                    ) : null}
                    {isOpen ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600"
                        disabled={!!isBusy}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCloseClick?.(tender.id);
                        }}
                        title="Close tender"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Close</span>
                      </button>
                    ) : null}
                    {isClosedOnly && isPremium && onReopenClick ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600"
                        disabled={!!isBusy}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onReopenClick(tender.id);
                        }}
                        title="Reopen tender"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Reopen</span>
                      </button>
                    ) : null}
                    {(isDraft || isOpen || isClosed) && onDeleteClick ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={!!isBusy}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteClick(tender.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">View</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
