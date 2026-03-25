import type { PayType } from '@/lib/types';

/** User-facing label for job `pay_type` (DB may still store legacy `quote_required`). */
export function formatJobPayTypeLabel(payType: string | null | undefined): string {
  switch (payType) {
    case 'fixed':
      return 'Asking price';
    case 'hourly':
      return 'Hourly rate';
    case 'day_rate':
      return 'Day rate';
    case 'quote_required':
      return 'Rate to be agreed';
    default:
      return (payType || '').replace(/_/g, ' ').trim() || '—';
  }
}

/**
 * When a job has no numeric rate, explain why (jobs-only; not tender “quotes”).
 * `short` — compact (cards). `long` — full sentence (job detail).
 */
export function formatJobPriceDisplay(
  job: { rate?: number | null; payType?: PayType | string | null },
  style: 'short' | 'long' = 'short'
): string {
  const rate = job.rate != null ? Number(job.rate) : NaN;
  if (Number.isFinite(rate) && rate > 0) {
    const pt = job.payType;
    if (style === 'long') {
      if (pt === 'hourly') return `$${rate} per hour`;
      if (pt === 'day_rate') return `$${rate} per day`;
      return `$${rate} fixed price`;
    }
    const suffix = pt === 'hourly' ? '/hr' : pt === 'day_rate' ? '/day' : '';
    return `$${rate}${suffix}`;
  }
  if (job.payType === 'quote_required') {
    return 'Rate to be agreed';
  }
  return 'Price not specified';
}

/** Public profile pricing type (`users.pricing_type`); value `quote_on_request` kept for DB compatibility. */
export function formatProfilePricingTypeLabel(
  pricingType: 'hourly' | 'day' | 'from_hourly' | 'quote_on_request' | string | null | undefined
): string {
  switch (pricingType) {
    case 'hourly':
      return 'Hourly';
    case 'day':
      return 'Day rate';
    case 'from_hourly':
      return 'From (hourly)';
    case 'quote_on_request':
      return 'Pricing on enquiry';
    default:
      return pricingType ? String(pricingType).replace(/_/g, ' ') : '';
  }
}
