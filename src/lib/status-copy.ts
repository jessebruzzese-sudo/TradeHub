export const TenderStatusLabel = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  LIVE: 'Live',
  CLOSED: 'Closed',
  AWARDED: 'Awarded',
  CANCELLED: 'Cancelled',
} as const;

export const TenderStatusDescription = {
  DRAFT: 'Not yet published',
  PENDING: 'Awaiting admin approval',
  LIVE: 'Accepting quotes',
  CLOSED: 'No longer accepting quotes',
  AWARDED: 'Contract awarded',
  CANCELLED: 'Tender cancelled',
} as const;

export const ApplicationStatusLabel = {
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CONFIRMED: 'Confirmed',
  WITHDRAWN: 'Withdrawn',
} as const;

export const ApplicationStatusDescription = {
  PENDING: 'Application submitted',
  SHORTLISTED: 'Under consideration',
  ACCEPTED: 'Offer extended',
  DECLINED: 'Not selected',
  CONFIRMED: 'Hire confirmed',
  WITHDRAWN: 'Application withdrawn',
} as const;

export const JobStatusLabel = {
  OPEN: 'Open',
  ACCEPTED: 'Accepted',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const JobStatusDescription = {
  OPEN: 'Reviewing applications',
  ACCEPTED: 'Subcontractor selected',
  CONFIRMED: 'Hire confirmed',
  IN_PROGRESS: 'Work in progress',
  COMPLETED: 'Job completed',
  CANCELLED: 'Job cancelled',
} as const;

export const QuoteStatusLabel = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
} as const;

export const QuoteStatusDescription = {
  SUBMITTED: 'Quote submitted',
  UNDER_REVIEW: 'Being reviewed',
  ACCEPTED: 'Quote accepted',
  DECLINED: 'Quote declined',
  WITHDRAWN: 'Quote withdrawn',
} as const;

export const SubscriptionPlanLabel = {
  FREE: 'Free',
  SUBCONTRACTOR_PRO: 'Subcontractor Pro',
  BUILDER_PREMIUM: 'Builder Premium',
  ALL_ACCESS_PRO: 'All-Access Pro',
} as const;

export const SubscriptionPlanDescription = {
  FREE: 'Basic access',
  SUBCONTRACTOR_PRO: '$10/month - Full subcontractor features',
  BUILDER_PREMIUM: '$30/month - Unlimited premium tenders',
  ALL_ACCESS_PRO: '$36/month - Full platform access',
} as const;

export const TenderTierLabel = {
  FREE_TRIAL: 'Free Trial',
  BASIC_8: 'Basic',
  PREMIUM_14: 'Premium',
} as const;

export const TenderTierDescription = {
  FREE_TRIAL: 'One-time free trial tender',
  BASIC_8: '$8 - Standard visibility',
  PREMIUM_14: '$14 - Maximum reach',
} as const;

export const ApprovalStatusLabel = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export const ApprovalStatusDescription = {
  PENDING: 'Awaiting admin review',
  APPROVED: 'Approved by admin',
  REJECTED: 'Rejected by admin',
} as const;

export type TenderStatus = keyof typeof TenderStatusLabel;
export type ApplicationStatus = keyof typeof ApplicationStatusLabel;
export type JobStatus = keyof typeof JobStatusLabel;
export type QuoteStatus = keyof typeof QuoteStatusLabel;
export type SubscriptionPlan = keyof typeof SubscriptionPlanLabel;
export type TenderTier = keyof typeof TenderTierLabel;
export type ApprovalStatus = keyof typeof ApprovalStatusLabel;

export function getTenderStatusBadgeColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'LIVE':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-blue-100 text-blue-800';
    case 'AWARDED':
      return 'bg-purple-100 text-purple-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getApplicationStatusBadgeColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'SHORTLISTED':
      return 'bg-blue-100 text-blue-800';
    case 'ACCEPTED':
      return 'bg-green-100 text-green-800';
    case 'DECLINED':
      return 'bg-red-100 text-red-800';
    case 'CONFIRMED':
      return 'bg-purple-100 text-purple-800';
    case 'WITHDRAWN':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getJobStatusBadgeColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800';
    case 'ACCEPTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-indigo-100 text-indigo-800';
    case 'COMPLETED':
      return 'bg-purple-100 text-purple-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getQuoteStatusBadgeColor(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-800';
    case 'UNDER_REVIEW':
      return 'bg-yellow-100 text-yellow-800';
    case 'ACCEPTED':
      return 'bg-green-100 text-green-800';
    case 'DECLINED':
      return 'bg-red-100 text-red-800';
    case 'WITHDRAWN':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
