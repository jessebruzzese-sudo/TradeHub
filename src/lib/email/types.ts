export type TransactionalEmailType =
  | 'account_verification'
  | 'welcome'
  | 'password_reset'
  | 'premium_upgraded'
  | 'payment_receipt'
  | 'payment_failed'
  | 'job_invite'
  | 'job_alert'
  | 'hire_confirmed'
  | 'new_message'
  | 'abn_verified'
  | 'reliability_review'
  | 'weekly_opportunity_digest';

export type TransactionalEmailStatus = 'pending' | 'sent' | 'failed';

export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export type AccountVerificationTemplateInput = {
  firstName?: string;
  verifyUrl: string;
};

export type WelcomeTemplateInput = {
  firstName?: string;
  dashboardUrl: string;
};

export type PasswordResetTemplateInput = {
  firstName?: string;
  resetUrl: string;
};

export type PremiumUpgradedTemplateInput = {
  firstName?: string;
  billingUrl: string;
};

export type PaymentReceiptTemplateInput = {
  firstName?: string;
  amountLabel: string;
  dateLabel: string;
  billingUrl: string;
};

export type PaymentFailedTemplateInput = {
  firstName?: string;
  billingUrl: string;
};

export type JobInviteTemplateInput = {
  firstName?: string;
  inviterName: string;
  jobTitle: string;
  location?: string;
  jobUrl: string;
  conversationUrl?: string;
};

export type JobAlertTemplateInput = {
  firstName?: string;
  trade: string;
  location: string;
  jobUrl: string;
};

export type HireConfirmedTemplateInput = {
  firstName?: string;
  projectName: string;
  startDateLabel?: string;
  detailsUrl: string;
};

export type NewMessageTemplateInput = {
  firstName?: string;
  messagesUrl: string;
};

export type AbnVerifiedTemplateInput = {
  firstName?: string;
  profileUrl: string;
};

export type ReliabilityReviewTemplateInput = {
  firstName?: string;
  reviewsUrl: string;
};

export type WeeklyOpportunityDigestTemplateInput = {
  firstName?: string;
  opportunities: string[];
  jobsUrl: string;
};

export type TransactionalEmailPayloadMap = {
  account_verification: AccountVerificationTemplateInput;
  welcome: WelcomeTemplateInput;
  password_reset: PasswordResetTemplateInput;
  premium_upgraded: PremiumUpgradedTemplateInput;
  payment_receipt: PaymentReceiptTemplateInput;
  payment_failed: PaymentFailedTemplateInput;
  job_invite: JobInviteTemplateInput;
  job_alert: JobAlertTemplateInput;
  hire_confirmed: HireConfirmedTemplateInput;
  new_message: NewMessageTemplateInput;
  abn_verified: AbnVerifiedTemplateInput;
  reliability_review: ReliabilityReviewTemplateInput;
  weekly_opportunity_digest: WeeklyOpportunityDigestTemplateInput;
};

export type TransactionalEmailPayload<T extends TransactionalEmailType> =
  TransactionalEmailPayloadMap[T];

