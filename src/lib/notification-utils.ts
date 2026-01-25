import { User, Job, Notification } from './types';
import { get48HourReminderMessage } from './reliability-utils';

export function shouldSendEmailNotification(user: User): boolean {
  if (user.role !== 'subcontractor') return false;
  return user.subcontractorWorkAlertEmail ?? true;
}

export function shouldSendSmsNotification(user: User): boolean {
  if (user.role !== 'subcontractor') return false;
  return user.subcontractorWorkAlertSms ?? false;
}

export function shouldSendInAppNotification(user: User): boolean {
  if (user.role !== 'subcontractor') return false;
  return user.subcontractorWorkAlertInApp ?? true;
}

export async function send48HourReminder(
  job: Job,
  subcontractor: User
): Promise<void> {
  if (job.status !== 'confirmed' || !job.startsAt) {
    return;
  }

  const { title, body } = get48HourReminderMessage(job);

  if (shouldSendInAppNotification(subcontractor)) {
    await createInAppNotification(subcontractor.id, title, body, job.id);
  }

  if (shouldSendEmailNotification(subcontractor)) {
    await sendEmailNotification(subcontractor.email, title, body);
  }

  if (shouldSendSmsNotification(subcontractor)) {
    await sendSmsNotification(subcontractor.id, title, body);
  }
}

async function createInAppNotification(
  userId: string,
  title: string,
  description: string,
  jobId?: string
): Promise<void> {
  console.log(`Creating in-app notification for ${userId}: ${title}`);
}

async function sendEmailNotification(
  email: string,
  title: string,
  body: string
): Promise<void> {
  console.log(`Sending email to ${email}: ${title}`);
}

async function sendSmsNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  console.log(`Sending SMS to user ${userId}: ${title}`);
}

export function create48HReminderNotification(job: Job): Notification {
  const { title, body } = get48HourReminderMessage(job);

  return {
    id: `notif-${Date.now()}`,
    userId: job.confirmedSubcontractor || '',
    type: '48h_reminder',
    title,
    description: body,
    jobId: job.id,
    read: false,
    createdAt: new Date(),
    link: `/jobs/${job.id}`,
  };
}

export function createSmsOptInNotification(userId: string): Notification {
  return {
    id: `notif-${Date.now()}`,
    userId,
    type: 'sms_opt_in',
    title: 'You just missed a matching job',
    description: 'A contractor posted work near you, but it was filled before you saw it. Enable SMS alerts to get notified faster.',
    read: false,
    createdAt: new Date(),
  };
}

export function createReliabilityWarningNotification(
  userId: string,
  eventCount: number
): Notification {
  const remaining = 3 - eventCount;

  let description = '';
  if (remaining <= 0) {
    description = 'Your account has been flagged for admin review due to repeated non-fulfillments. We will contact you soon.';
  } else if (remaining === 1) {
    description = `You have ${eventCount} non-fulfillments in the last 90 days. One more may trigger an account review. Please ensure you fulfill all confirmed jobs.`;
  }

  return {
    id: `notif-${Date.now()}`,
    userId,
    type: 'reliability_warning',
    title: 'Account reliability notice',
    description,
    read: false,
    createdAt: new Date(),
  };
}

export function createSubcontractingAvailabilityNotification(
  userId: string,
  subcontractorName: string,
  trade: string
): Notification {
  return {
    id: `notif-${Date.now()}`,
    userId,
    type: 'subcontracting_availability',
    title: 'Subcontractor availability nearby',
    description: `${subcontractorName} (${trade}) has listed available subcontracting dates in your area.`,
    read: false,
    createdAt: new Date(),
  };
}

export async function notifyContractorsAboutAvailability(
  subcontractor: User,
  dateRanges: Date[]
): Promise<void> {
  console.log(`Notifying contractors about ${subcontractor.name}'s availability: ${dateRanges.length} dates`);
}
