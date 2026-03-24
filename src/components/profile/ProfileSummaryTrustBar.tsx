type Props = {
  rating?: number | null;
  reviewCount?: number | null;
  reliabilityPercent?: number | null;
  profileStrengthScore?: number | null;
};

export default function ProfileSummaryTrustBar({
  rating,
  reviewCount,
  reliabilityPercent,
  profileStrengthScore,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
      {typeof rating === 'number' ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
          <span>⭐</span>
          <span className="font-medium">{rating.toFixed(1)}</span>
          {typeof reviewCount === 'number' ? <span className="text-slate-500">({reviewCount})</span> : null}
        </span>
      ) : null}

      {typeof reliabilityPercent === 'number' ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
          <span>🟢</span>
          <span className="font-medium">{reliabilityPercent}% reliability</span>
        </span>
      ) : null}

      {typeof profileStrengthScore === 'number' ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
          <span>💪</span>
          <span className="font-medium">{profileStrengthScore}% profile strength</span>
        </span>
      ) : null}
    </div>
  );
}
