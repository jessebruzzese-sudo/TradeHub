import type {
  HireConfirmedTemplateInput,
  JobInviteTemplateInput,
  PremiumUpgradedTemplateInput,
  QuoteRequestTemplateInput,
  WelcomeTemplateInput,
} from '@/lib/email/types';

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:3000'
  );
}

function firstName(name?: string | null): string | undefined {
  const n = (name || '').trim();
  if (!n) return undefined;
  return n.split(/\s+/)[0] || undefined;
}

export function buildWelcomeTemplateData(input: {
  name?: string | null;
}): WelcomeTemplateInput {
  const base = appBaseUrl();
  return {
    firstName: firstName(input.name),
    dashboardUrl: `${base}/dashboard`,
  };
}

export function buildPremiumUpgradedTemplateData(input: {
  name?: string | null;
}): PremiumUpgradedTemplateInput {
  const base = appBaseUrl();
  return {
    firstName: firstName(input.name),
    billingUrl: `${base}/settings/billing`,
  };
}

export function buildJobInviteTemplateData(input: {
  recipientName?: string | null;
  inviterName?: string | null;
  jobTitle: string;
  location?: string | null;
  jobId: string;
  inviterId?: string | null;
}): JobInviteTemplateInput {
  const base = appBaseUrl();
  const cleanLocation = (input.location || '').trim() || undefined;
  return {
    firstName: firstName(input.recipientName),
    inviterName: (input.inviterName || 'A contractor').trim(),
    jobTitle: input.jobTitle || 'New job opportunity',
    location: cleanLocation,
    jobUrl: `${base}/jobs/${input.jobId}`,
    conversationUrl: input.inviterId ? `${base}/messages?userId=${input.inviterId}` : undefined,
  };
}

export function buildQuoteRequestTemplateData(input: {
  recipientName?: string | null;
  requesterName?: string | null;
  tenderId?: string;
}): QuoteRequestTemplateInput {
  const base = appBaseUrl();
  return {
    firstName: firstName(input.recipientName),
    requesterName: (input.requesterName || 'A TradeHub user').trim(),
    requestUrl: `${base}/messages`,
  };
}

export function buildHireConfirmedTemplateData(input: {
  recipientName?: string | null;
  title: string;
  whenLabel?: string | null;
  detailsPath: string;
}): HireConfirmedTemplateInput {
  const base = appBaseUrl();
  const path = input.detailsPath.startsWith('/') ? input.detailsPath : `/${input.detailsPath}`;
  return {
    firstName: firstName(input.recipientName),
    projectName: input.title || 'Job',
    startDateLabel: (input.whenLabel || '').trim() || undefined,
    detailsUrl: `${base}${path}`,
  };
}

