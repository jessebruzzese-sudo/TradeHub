import { TrustStatus, JobStatus } from '@/lib/types';

interface StatusPillProps {
  type: 'trust' | 'job';
  status: TrustStatus | JobStatus;
  label?: string;
}

const trustStatusConfig = {
  pending: {
    bg: 'bg-yellow-50 border-yellow-200',
    dot: 'bg-yellow-400',
    text: 'text-yellow-700',
    label: 'Verification in progress',
  },
  approved: {
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
    text: 'text-green-700',
    label: 'Approved',
  },
  verified: {
    bg: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    label: 'Verified',
  },
};

const jobStatusConfig = {
  open: {
    bg: 'bg-yellow-50 border-yellow-200',
    dot: 'bg-yellow-400',
    text: 'text-yellow-700',
    label: 'Open',
  },
  pending_approval: {
    bg: 'bg-orange-50 border-orange-200',
    dot: 'bg-orange-400',
    text: 'text-orange-700',
    label: 'Pending approval',
  },
  accepted: {
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
    text: 'text-green-700',
    label: 'Accepted',
  },
  confirmed: {
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-600',
    text: 'text-green-700',
    label: 'Confirmed',
  },
  completed: {
    bg: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-700',
    label: 'Cancelled',
  },
  closed: {
    bg: 'bg-gray-50 border-gray-200',
    dot: 'bg-gray-400',
    text: 'text-gray-700',
    label: 'Closed',
  },
};

export function StatusPill({ type, status, label }: StatusPillProps) {
  const config = type === 'trust' ? trustStatusConfig[status as TrustStatus] : jobStatusConfig[status as JobStatus];

  if (!config) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-xs font-medium ${config.text}`}>{label || config.label}</span>
    </div>
  );
}
