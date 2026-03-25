import {
  getGoogleBusinessBadgeLabel,
  getGoogleBusinessBadgeTier,
  getGoogleBusinessStatusLabel,
} from '@/lib/google-business';

type Props = {
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  googleBusinessUrl?: string | null;
  googleBusinessName?: string | null;
  googleBusinessAddress?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleListingVerificationStatus?: string | null;
  /** Same fields as job gating — badge tier uses `hasValidABN` internally. */
  abn?: string | null;
  abnStatus?: string | null;
};

export default function ExternalProofSection({
  websiteUrl,
  instagramUrl,
  facebookUrl,
  linkedinUrl,
  googleBusinessUrl,
  googleBusinessName,
  googleBusinessAddress,
  googleRating,
  googleReviewCount,
  googleListingVerificationStatus,
  abn,
  abnStatus,
}: Props) {
  const hasAny =
    websiteUrl || instagramUrl || facebookUrl || linkedinUrl || googleBusinessUrl;

  if (!hasAny) return null;

  const googleBadgeTier = getGoogleBusinessBadgeTier({
    google_business_url: googleBusinessUrl,
    google_rating: googleRating,
    google_review_count: googleReviewCount,
    google_listing_verification_status: googleListingVerificationStatus,
    abn,
    abn_status: abnStatus,
  });
  const googleBadgeLabel = getGoogleBusinessBadgeLabel({
    google_business_url: googleBusinessUrl,
    google_rating: googleRating,
    google_review_count: googleReviewCount,
    google_listing_verification_status: googleListingVerificationStatus,
    abn,
    abn_status: abnStatus,
  });
  const googleStatusLabel = getGoogleBusinessStatusLabel({
    google_listing_verification_status: googleListingVerificationStatus,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">External proof</h3>

      <div className="mt-4 space-y-3 text-sm">
        {websiteUrl ? <ProofLink label="Website" href={websiteUrl} /> : null}
        {instagramUrl ? <ProofLink label="Instagram" href={instagramUrl} /> : null}
        {facebookUrl ? <ProofLink label="Facebook" href={facebookUrl} /> : null}
        {linkedinUrl ? <ProofLink label="LinkedIn" href={linkedinUrl} /> : null}

        {googleBusinessUrl ? (
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={googleBusinessUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-900 underline-offset-4 hover:underline"
              >
                {googleBusinessName?.trim() || 'Google Business'}
              </a>

              {googleBadgeTier !== 'none' ? (
                <span
                  className={[
                    'rounded-full border px-2.5 py-1 text-xs font-medium',
                    googleBadgeTier === 'gold'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : googleBadgeTier === 'blue'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-slate-100 text-slate-700',
                  ].join(' ')}
                >
                  {googleBadgeTier === 'gold'
                    ? 'Highly trusted Google listing'
                    : googleBadgeTier === 'blue'
                      ? 'Google listing verified'
                      : 'Google listing linked'}
                </span>
              ) : null}
            </div>

            {typeof googleRating === 'number' || typeof googleReviewCount === 'number' ? (
              <div className="mt-2 text-slate-600">
                Google rating:{' '}
                <span className="font-medium text-slate-900">
                  {typeof googleRating === 'number' ? `${googleRating.toFixed(1)} ★` : '—'}
                </span>
                {typeof googleReviewCount === 'number' ? ` (${googleReviewCount} reviews)` : ''}
              </div>
            ) : null}
            {googleBusinessAddress?.trim() ? (
              <div className="mt-1 text-xs text-slate-500">{googleBusinessAddress.trim()}</div>
            ) : null}
            <div className="mt-1 text-xs text-slate-500">
              {googleBadgeLabel ?? googleStatusLabel}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProofLink({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <span className="text-slate-600">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-slate-900 underline-offset-4 hover:underline"
      >
        Open
      </a>
    </div>
  );
}
