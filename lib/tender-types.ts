export type TenderTier = 'FREE_TRIAL' | 'BASIC_8' | 'PREMIUM_14';
export type TenderStatus = 'DRAFT' | 'LIVE' | 'CLOSED' | 'CANCELLED';
export type TenderApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type QuoteStatus = 'SUBMITTED' | 'WITHDRAWN' | 'ACCEPTED' | 'REJECTED';
export type QuoteBillingMode = 'FREE_MONTHLY_TRIAL' | 'SUBSCRIPTION';

export type BuilderPlan = 'NONE' | 'PREMIUM_SUBSCRIPTION';
export type ContractorPlan = 'NONE' | 'STANDARD_10' | 'PREMIUM_20';
export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface Tender {
  id: string;
  builderId: string;
  status: TenderStatus;
  tier: TenderTier;
  isNameHidden: boolean;
  projectName: string;
  projectDescription?: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
  desiredStartDate?: Date;
  desiredEndDate?: Date;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  quoteCapTotal?: number;
  quoteCountTotal: number;
  limitedQuotesEnabled?: boolean;
  closesAt?: Date;
  approvalStatus: TenderApprovalStatus;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  trades?: TenderTrade[];
  tradeRequirements?: TenderTradeRequirement[];
  documents?: TenderDocument[];
  quotes?: TenderQuote[];
  builder?: {
    id: string;
    name: string;
    businessName?: string;
    rating: number;
    completedJobs: number;
  };
}

export interface TenderTrade {
  id: string;
  tenderId: string;
  tradeSlug: string;
  tradeName: string;
}

export interface TenderTradeRequirement {
  id: string;
  tenderId: string;
  trade: string;
  subDescription: string;
  minBudgetCents?: number;
  maxBudgetCents?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenderDocument {
  id: string;
  tenderId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: Date;
}

export interface TenderQuote {
  id: string;
  tenderId: string;
  contractorId: string;
  status: QuoteStatus;
  priceCents: number;
  notes?: string;
  billingMode: QuoteBillingMode;
  billingMonthKey: string;
  submittedAt: Date;
  createdAt: Date;
  contractor?: {
    id: string;
    name: string;
    businessName?: string;
    rating: number;
    completedJobs: number;
    trustStatus: string;
  };
}

export interface TenderFilters {
  search?: string;
  trades?: string[];
  minBudget?: number;
  maxBudget?: number;
  suburb?: string;
  postcode?: string;
  status?: TenderStatus;
}

export const TENDER_TIER_OPTIONS = [
  {
    value: 'FREE_TRIAL' as TenderTier,
    label: 'Free Trial',
    description: '15km radius, max 3 quotes per trade',
    price: 'Free (one-time)',
    features: ['15km radius only', 'Maximum 3 quotes per selected trade', 'Basic visibility'],
  },
  {
    value: 'BASIC_8' as TenderTier,
    label: 'Basic',
    description: '15km radius, max 3 quotes per trade',
    price: '$8',
    features: ['15km radius only', 'Maximum 3 quotes per selected trade', 'Standard visibility'],
  },
  {
    value: 'PREMIUM_14' as TenderTier,
    label: 'Premium',
    description: 'Unlimited radius & quotes + alerts',
    price: '$14',
    features: [
      'Unlimited radius',
      'Unlimited quotes',
      'Priority visibility',
      'Email/SMS alerts to contractors',
    ],
  },
];

export const CONTRACTOR_PLAN_OPTIONS = [
  {
    value: 'NONE' as ContractorPlan,
    label: 'Free',
    description: '1 free quote per month',
    price: 'Free',
    features: ['1 free quote per month', '15km radius only'],
  },
  {
    value: 'STANDARD_10' as ContractorPlan,
    label: 'Standard',
    description: 'Unlimited quotes within 15km',
    price: '$10/month',
    features: ['Unlimited quotes', '15km radius only', 'Standard support'],
  },
  {
    value: 'PREMIUM_20' as ContractorPlan,
    label: 'Premium',
    description: 'Unlimited quotes & radius + alerts',
    price: '$30/month',
    features: [
      'Unlimited quotes',
      'Unlimited radius',
      'Email/SMS alerts',
      'Priority support',
    ],
  },
];

export const BUILDER_PLAN_OPTIONS = [
  {
    value: 'NONE' as BuilderPlan,
    label: 'Pay Per Tender',
    description: 'Pay for each tender individually',
    price: 'From $8',
    features: ['Choose tier per tender', 'No monthly commitment', 'Includes 1 free trial'],
  },
  {
    value: 'PREMIUM_SUBSCRIPTION' as BuilderPlan,
    label: 'Premium Subscription',
    description: 'Unlimited premium tenders',
    price: '$30/month or $60/3 months',
    features: [
      'Unlimited Premium tenders',
      'No per-tender charges',
      'All Premium features included',
    ],
  },
];
