import { ReliabilityEvent, ReliabilityEventType, User, Job } from './types';

const RELIABILITY_THRESHOLD = 3;
const ROLLING_WINDOW_DAYS = 90;

export async function getReliabilityEventsCount(
  subcontractorId: string,
  windowDays: number = ROLLING_WINDOW_DAYS
): Promise<number> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  return 0;
}

export async function createReliabilityEvent(
  subcontractorId: string,
  jobId: string,
  contractorId: string,
  eventType: ReliabilityEventType,
  contractorNotes?: string
): Promise<ReliabilityEvent | null> {
  const event: ReliabilityEvent = {
    id: `rel-${Date.now()}`,
    subcontractorId,
    jobId,
    contractorId,
    eventType,
    eventDate: new Date(),
    contractorNotes,
    adminReviewed: false,
    createdAt: new Date(),
  };

  const eventsInWindow = await getReliabilityEventsCount(subcontractorId);

  if (eventsInWindow + 1 >= RELIABILITY_THRESHOLD) {
    await flagAccountForReview(subcontractorId, eventsInWindow + 1);
  }

  return event;
}

export async function flagAccountForReview(
  subcontractorId: string,
  eventCount: number
): Promise<void> {
  console.log(`Flagging account ${subcontractorId} for review. Event count: ${eventCount}`);
}

export function shouldShowReliabilityWarning(eventsInWindow: number): boolean {
  return eventsInWindow >= RELIABILITY_THRESHOLD - 1;
}

export function getReliabilityWarningMessage(eventsInWindow: number): string {
  const remaining = RELIABILITY_THRESHOLD - eventsInWindow;

  if (remaining <= 0) {
    return 'Your account has been flagged for admin review due to repeated non-fulfillments.';
  } else if (remaining === 1) {
    return `You have ${eventsInWindow} non-fulfillment${eventsInWindow > 1 ? 's' : ''} in the last 90 days. One more may trigger an account review.`;
  } else {
    return `You have ${eventsInWindow} non-fulfillment${eventsInWindow > 1 ? 's' : ''} in the last 90 days.`;
  }
}

export function get48HourReminderTime(startsAt: Date): Date {
  const reminderTime = new Date(startsAt);
  reminderTime.setHours(reminderTime.getHours() - 48);
  return reminderTime;
}

export function shouldSend48HourReminder(job: Job): boolean {
  if (!job.startsAt || job.reminder48hSent || job.status !== 'confirmed') {
    return false;
  }

  const now = new Date();
  const reminderTime = get48HourReminderTime(job.startsAt);

  return now >= reminderTime;
}

export function get48HourReminderMessage(job: Job): {
  title: string;
  body: string;
} {
  const dateStr = job.startsAt?.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return {
    title: 'Upcoming job in 48 hours',
    body: `You're scheduled for ${job.title} on ${dateStr}. If you can't make it, please cancel early — late cancellations may allow a reliability review. Repeated non-fulfillments may trigger an account review.`,
  };
}

export function isAccountSuspended(user: User): boolean {
  if (!user.accountSuspended) return false;

  if (user.suspensionEndsAt) {
    return new Date() < user.suspensionEndsAt;
  }

  return true;
}

export function getSuspensionMessage(user: User): string {
  if (!user.accountSuspended) return '';

  if (user.suspensionEndsAt) {
    const daysRemaining = Math.ceil(
      (user.suspensionEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return `Your account is temporarily suspended. Suspension ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`;
  }

  return 'Your account has been permanently suspended. Please contact support for more information.';
}
