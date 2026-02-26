// lib/types.ts

export type UserRole = 'contractor' | 'subcontractor' | 'admin';

export type TrustStatus = 'pending' | 'approved' | 'verified';

export type JobStatus = 'open' | 'accepted' | 'confirmed' | 'completed' | 'cancelled' | 'closed';

export type ApplicationStatus = 'applied' | 'selected' | 'accepted' | 'declined' | 'confirmed' | 'completed';

export type PayType = 'fixed' | 'hourly' | 'quote_required';

export type SubcontractorPlan = 'NONE' | 'PRO_10';

export type SubcontractorSubStatus = 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export type SubscriptionPlan =
  | 'NONE'
  | 'BUSINESS_PRO_20'
  | 'SUBCONTRACTOR_PRO_10'
  | 'ALL_ACCESS_PRO_26';

export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export type Capability = 'BUILDER' | 'CONTRACTOR' | 'SUBCONTRACTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trustStatus: TrustStatus;

  /**
   * ✅ Standardised to match Supabase column naming.
   * Store the avatar URL (public URL or signed URL) here.
   */
  avatar?: string | null;

  bio?: string;
  miniBio?: string | null;
  phone?: string | null;
  showPhoneOnProfile?: boolean | null;
  showEmailOnProfile?: boolean | null;
  rating: number;
  reliabilityRating?: number;
  completedJobs: number;

  memberSince: Date;
  createdAt: Date;

  businessName?: string;
  abn?: string;

  primaryTrade?: string;
  additionalTrades?: string[];
  additionalTradesUnlocked?: boolean;
  trades?: string[];

  location?: string;
  postcode?: string;
  locationLat?: number;
  locationLng?: number;

  searchLocation?: string;
  searchPostcode?: string;
  searchLat?: number;
  searchLng?: number;

  radius?: number;

  availability?: { [key: string]: boolean };

  subcontractorPlan?: SubcontractorPlan;
  subcontractorSubStatus?: SubcontractorSubStatus;
  subcontractorSubRenewsAt?: Date;
  subcontractorPreferredRadiusKm?: number;

  subcontractorAlertsEnabled?: boolean;
  subcontractorAlertChannelInApp?: boolean;
  subcontractorAlertChannelEmail?: boolean;
  subcontractorAlertChannelSms?: boolean;

  subcontractorAvailabilityHorizonDays?: number;

  subcontractorWorkAlertsEnabled?: boolean;
  subcontractorWorkAlertInApp?: boolean;
  subcontractorWorkAlertEmail?: boolean;
  subcontractorWorkAlertSms?: boolean;

  subcontractorAvailabilityBroadcastEnabled?: boolean;

  smsOptInPromptShown?: boolean;
  smsOptInPromptDismissedAt?: Date;

  accountFlaggedForReview?: boolean;
  accountSuspended?: boolean;
  suspensionEndsAt?: Date;

  activePlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionRenewsAt?: Date;
  subscriptionStartedAt?: Date;
  subscriptionCanceledAt?: Date;

  complimentaryPremiumUntil?: string;
  complimentaryReason?: string;

  lastSeenAt?: string;

  abnStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  abnVerifiedAt?: string;
  abnVerifiedBy?: string;
  abnRejectionReason?: string;
  abnSubmittedAt?: string;

  /** Entity type returned by ABR (e.g. "Australian Private Company"). */
  entityType?: string;
  /** Last time the ABN was checked against ABR. */
  abnLastCheckedAt?: string;
}

export interface Job {
  id: string;
  contractorId: string;
  title: string;
  description: string;
  tradeCategory: string;
  location: string;
  postcode: string;
  dates: Date[];
  startTime?: string;
  duration?: number;
  payType: PayType;
  rate: number;
  attachments?: string[];
  status: JobStatus;
  selectedSubcontractor?: string;
  confirmedSubcontractor?: string;
  createdAt: Date;
  startDate?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  wasAcceptedOrConfirmedBeforeCancellation?: boolean;
  startsAt?: Date;
  fulfilled?: boolean;
  fulfillmentMarkedBy?: string;
  fulfillmentMarkedAt?: Date;
  reminder48hSent?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  subcontractorId: string;
  status: ApplicationStatus;
  appliedAt: Date;
  message?: string;
  selectedDates?: Date[];
  respondedAt?: Date;
  withdrawnAt?: Date;
  withdrawnReason?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  isSystemMessage?: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  jobId: string;
  contractorId: string;
  subcontractorId: string;
  lastMessage?: Message;
  lastReadByContractor?: Date;
  lastReadBySubcontractor?: Date;
  updatedAt: Date;
  createdAt: Date;
}

export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  jobId: string;
  authorId: string;
  recipientId: string;
  rating: number;
  text: string;
  isReliabilityReview?: boolean;
  reliabilityScore?: number;
  communicationScore?: number;
  moderationStatus: ReviewModerationStatus;
  createdAt: Date;
  reply?: {
    text: string;
    createdAt: Date;
  };
}

export type AuditActionType =
  | 'user_verification_approved'
  | 'user_verification_rejected'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'review_approved'
  | 'review_rejected'
  | 'admin_note_added'
  | 'job_viewed'
  | 'reliability_event_created'
  | 'admin_review_case_created'
  | 'admin_review_case_resolved'
  | 'reliability_warning_issued'
  | 'account_flagged_for_review'
  | 'abn_verified'
  | 'abn_rejected';

export interface AuditLog {
  id: string;
  adminId: string;
  actionType: AuditActionType;
  targetUserId?: string;
  targetJobId?: string;
  targetReviewId?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AdminNote {
  id: string;
  adminId: string;
  userId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'job_posted'
    | 'new_message'
    | 'selected'
    | 'confirmed'
    | 'reminder'
    | 'completed'
    | 'review'
    | 'application'
    | 'late_cancellation'
    | 'sms_opt_in'
    | 'reliability_warning'
    | '48h_reminder'
    | 'subcontracting_availability';
  title: string;
  description: string;
  jobId?: string;
  conversationId?: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

export type ReliabilityEventType = 'NO_SHOW' | 'DID_NOT_COMPLETE' | 'LATE_CANCELLATION';

export interface ReliabilityEvent {
  id: string;
  subcontractorId: string;
  jobId: string;
  contractorId: string;
  eventType: ReliabilityEventType;
  eventDate: Date;
  contractorNotes?: string;
  adminReviewed: boolean;
  adminReviewedBy?: string;
  adminReviewedAt?: Date;
  createdAt: Date;
  subcontractorContext?: string;
  subcontractorContextSubmittedAt?: Date;
  contextWindowExpiresAt?: Date;
}

export type AdminReviewReason = 'RELIABILITY' | 'TRUST_VIOLATION' | 'FRAUD' | 'OTHER';

export type AdminReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'CLEARED'
  | 'WARNING_ISSUED'
  | 'SUSPENDED'
  | 'PERMANENTLY_BANNED';

export interface AdminReviewCase {
  id: string;
  subcontractorId: string;
  reason: AdminReviewReason;
  status: AdminReviewStatus;
  reliabilityEventCount: number;
  createdAt: Date;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolutionNotes?: string;
  suspensionDays?: number;
  suspensionEndsAt?: Date;
  updatedAt: Date;
}

export type SubscriptionEventType =
  | 'SUBSCRIBED'
  | 'UPGRADED'
  | 'DOWNGRADED'
  | 'RENEWED'
  | 'CANCELED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED';

export interface SubscriptionHistory {
  id: string;
  userId: string;
  eventType: SubscriptionEventType;
  fromPlan?: string;
  toPlan?: string;
  amountCents?: number;
  currency?: string;
  paymentProvider?: string;
  paymentProviderRef?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type UsageMetricType =
  | 'TENDER_POSTED'
  | 'JOB_POSTED'
  | 'QUOTE_RECEIVED'
  | 'APPLICATION_SUBMITTED'
  | 'AVAILABILITY_BROADCAST'
  | 'RADIUS_USED_KM';

export interface UsageMetric {
  id: string;
  userId: string;
  metricType: UsageMetricType;
  metricValue: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}
