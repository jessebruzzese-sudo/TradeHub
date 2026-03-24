type Props = {
  score: number;
  band: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELITE' | string;
  breakdown?: {
    activity: number;
    links: number;
    google: number;
    likes: number;
    completeness: number;
  };
};

function getBandStyles(band: string) {
  switch (band) {
    case 'ELITE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'HIGH':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'MEDIUM':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function ProfileStrengthCard({ score, band, breakdown }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">Profile strength</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-3xl font-semibold text-slate-900">{score}%</div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getBandStyles(band)}`}>
              {band}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Shows how established and complete this profile is.
          </p>
        </div>
      </div>

      {breakdown ? (
        <div className="space-y-2">
          <BreakdownRow label="Activity" value={breakdown.activity} max={40} />
          <BreakdownRow label="Links" value={breakdown.links} max={15} />
          <BreakdownRow label="Google" value={breakdown.google} max={20} />
          <BreakdownRow label="Likes" value={breakdown.likes} max={10} />
          <BreakdownRow label="Completeness" value={breakdown.completeness} max={15} />
        </div>
      ) : null}
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
