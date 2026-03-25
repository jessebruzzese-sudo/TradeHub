import Link from 'next/link';
import { Job } from '@/lib/types';
import StatusPill from './status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Calendar, Clock, DollarSign, MapPin, AlertCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import { isJobExpired, isPastStartDate } from '@/lib/job-lifecycle';
import { formatJobPriceDisplay } from '@/lib/job-pay-labels';

function getPosterName(p: any): string {
  return (
    p?.business_name ??
    p?.businessName ??
    p?.full_name ??
    p?.fullName ??
    p?.name ??
    'Poster'
  );
}

function getPosterAvatar(p: any): string | undefined {
  return p?.avatar_url ?? p?.avatarUrl ?? p?.avatar ?? undefined;
}

function getPosterRating(p: any): { rating: number | null; count: number | null } {
  const r = p?.rating;
  const c = p?.rating_count ?? p?.review_count ?? p?.reviews_count ?? null;
  const rating = typeof r === 'number' ? r : r != null ? Number(r) : null;
  const count = typeof c === 'number' ? c : c != null ? Number(c) : null;
  return {
    rating: Number.isFinite(rating as number) ? (rating as number) : null,
    count: Number.isFinite(count as number) ? (count as number) : null,
  };
}

interface JobCardProps {
  job: Job;
  showStatus?: boolean;
  /** Optional actions (e.g. Delete button) rendered near the status pill */
  extraActions?: React.ReactNode;
}

type JobRpcExtras = {
  distance_km?: number | null;
  distanceKm?: number | null;
  poster_is_premium?: boolean | null;
  posterIsPremium?: boolean | null;
  poster_plan?: string | null;
  posterPlan?: string | null;
};

export function JobCard({ job, showStatus = true, extraActions }: JobCardProps) {
  const extra = job as unknown as JobRpcExtras;
  const expired = isJobExpired(job);
  const pastStart = isPastStartDate(job);

  const distanceKmRaw = extra?.distance_km ?? extra?.distanceKm ?? null;
  const distanceKm =
    typeof distanceKmRaw === 'number' && isFinite(distanceKmRaw) ? distanceKmRaw : null;

  const distanceLabel =
    typeof distanceKm === 'number' && isFinite(distanceKm)
      ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`
      : null;

  const posterIsPremium = Boolean(extra?.poster_is_premium ?? extra?.posterIsPremium ?? false);
  const posterPlan = (extra?.poster_plan ?? extra?.posterPlan ?? null) as string | null;

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className={`bg-white border rounded-xl p-4 hover:shadow-md active:shadow-sm transition-shadow ${
        expired ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
      } md:flex md:items-center md:gap-6 md:min-h-0 min-h-[160px]`}>
        <div className="md:flex-1 md:flex md:items-center md:gap-6">
          <div className="flex justify-between items-start mb-3 md:mb-0 gap-2 md:flex-1">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 md:mb-0 line-clamp-2 md:line-clamp-1 break-words">{job.title}</h3>
              <p className="text-sm text-gray-600 truncate">{job.tradeCategory}</p>
              {(() => {
                const p = (job as any)?.poster;
                const name = getPosterName(p);
                const avatar = getPosterAvatar(p);
                const { rating, count } = getPosterRating(p);

                return (
                  <div className="mt-1 flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={avatar}
                      userName={name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-700">
                        {name}
                      </div>

                      {rating != null ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-medium text-slate-600">{rating.toFixed(1)}</span>
                          {count != null ? <span className="text-slate-400">({count})</span> : null}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">New</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {posterIsPremium && (
                <div className="hidden md:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                  <span>Pinned</span>
                  <span className="text-amber-700">(Premium)</span>
                  {posterPlan ? <span className="ml-1 font-normal text-amber-700">{String(posterPlan)}</span> : null}
                </div>
              )}
              {extraActions}
              {showStatus && (
                <div className="md:hidden">
                  <StatusPill type="job" status={job.status} />
                </div>
              )}
            </div>
          </div>

          {expired && job.status !== 'completed' && job.status !== 'cancelled' && (
            <div className="flex items-center gap-1.5 mb-3 md:mb-0 text-xs text-red-600 md:flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Expired</span>
            </div>
          )}

          {!expired && pastStart && job.status === 'open' && (
            <div className="flex items-center gap-1.5 mb-3 md:mb-0 text-xs text-orange-600 md:flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Start date passed</span>
            </div>
          )}

          <p className="text-sm text-gray-700 mb-4 md:mb-0 line-clamp-2 md:line-clamp-1 break-words md:flex-1">{job.description}</p>

          <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4 text-xs text-slate-600 md:flex-shrink-0">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 flex-shrink-0 text-sky-600" />
                <span className="truncate">{job.location}</span>
              </div>
              {distanceLabel && (
                <div className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  <MapPin className="h-3 w-3 text-sky-600" />
                  {distanceLabel}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-4 h-4 flex-shrink-0 text-indigo-600" />
              <span className="truncate">{format(job.dates[0], 'dd MMM')}</span>
            </div>
            {job.startTime && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span className="truncate">{job.startTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <DollarSign className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span className="truncate">{formatJobPriceDisplay(job, 'short')}</span>
            </div>
          </div>
        </div>

        {showStatus && (
          <div className="hidden md:block md:flex-shrink-0">
            <StatusPill type="job" status={job.status} />
          </div>
        )}
      </div>
    </Link>
  );
}
