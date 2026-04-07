import { Job, JobStatus, ApplicationStatus } from './types';
import { isJobCreatedWithinListingWindow } from './jobs/listing-window';

export interface JobLifecycleState {
  canCancel: boolean;
  canClose: boolean;
  canConfirmHire: boolean;
  canComplete: boolean;
  canReopen: boolean;
  /** True when the job listing is past the 30-day visibility window (should not appear in UI if queries filter correctly). */
  isExpired: boolean;
  isPastStartDate: boolean;
  allowsApplications: boolean;
  allowsSelection: boolean;
  statusMessage?: string;
  warningMessage?: string;
}

export interface StateTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Listing expiry is based on created_at (30-day window), not scheduled work dates.
 */
export function isJobExpired(job: Job): boolean {
  return !isJobCreatedWithinListingWindow(job.createdAt);
}

export function isPastStartDate(job: Job): boolean {
  if (!job.dates || job.dates.length === 0) {
    return false;
  }

  const startDate = new Date(job.dates[0]);
  if (job.startTime) {
    const [hours, minutes] = job.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }

  return new Date() > startDate;
}

export function getJobLifecycleState(job: Job, hasApplications: boolean = false): JobLifecycleState {
  const listingExpired = isJobExpired(job);
  const pastStart = isPastStartDate(job);

  const state: JobLifecycleState = {
    canCancel: false,
    canClose: false,
    canConfirmHire: false,
    canComplete: false,
    canReopen: false,
    isExpired: listingExpired,
    isPastStartDate: pastStart,
    allowsApplications: false,
    allowsSelection: false,
  };

  if (listingExpired) {
    state.statusMessage = 'This job listing is no longer available';
    state.warningMessage = 'This post has passed the 30-day listing period';
    return state;
  }

  switch (job.status) {
    case 'open':
      state.allowsApplications = true;
      state.allowsSelection = hasApplications;
      state.canClose = !hasApplications;
      state.canCancel = true;
      state.statusMessage = 'Job is open for applications';
      break;

    case 'accepted':
      state.canCancel = true;
      state.canConfirmHire = true;
      if (pastStart) {
        state.statusMessage = 'Accepted by subcontractor';
        state.warningMessage = 'Confirm hire soon — scheduled work date has started or passed';
      } else {
        state.statusMessage = 'Subcontractor accepted - confirm hire to proceed';
      }
      break;

    case 'confirmed':
      state.canCancel = !isPastLastDate(job);
      state.canComplete = isPastLastDate(job);

      if (isPastLastDate(job)) {
        state.statusMessage = 'Job period complete - mark as completed';
      } else if (pastStart) {
        state.statusMessage = 'Job in progress';
      } else {
        state.statusMessage = 'Hire confirmed - job starts soon';
      }
      break;

    case 'completed':
      state.statusMessage = 'Job completed successfully';
      break;

    case 'cancelled':
      state.statusMessage = 'Job cancelled';
      if (job.wasAcceptedOrConfirmedBeforeCancellation) {
        state.warningMessage = 'Cancelled after acceptance - reliability reviews may apply';
      }
      break;

    case 'closed':
      state.statusMessage = 'Job closed without hiring';
      state.canReopen = true;
      break;
  }

  return state;
}

export function isPastLastDate(job: Job): boolean {
  if (!job.dates || job.dates.length === 0) {
    return false;
  }

  const lastDate = new Date(job.dates[job.dates.length - 1]);
  lastDate.setHours(23, 59, 59, 999);

  return new Date() > lastDate;
}

export function canTransitionToStatus(
  currentStatus: JobStatus,
  newStatus: JobStatus,
  context: {
    hasApplications?: boolean;
    hasSelectedSubcontractor?: boolean;
    hasConfirmedSubcontractor?: boolean;
  } = {}
): StateTransitionResult {
  const validTransitions: Record<JobStatus, JobStatus[]> = {
    open: ['accepted', 'cancelled', 'closed'],
    accepted: ['confirmed', 'open', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    closed: ['open'],
  };

  const allowedNext = validTransitions[currentStatus];

  if (!allowedNext.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  if (newStatus === 'accepted' && !context.hasSelectedSubcontractor) {
    return {
      allowed: false,
      reason: 'Must select a trade business before accepting',
    };
  }

  if (newStatus === 'confirmed' && !context.hasSelectedSubcontractor) {
    return {
      allowed: false,
      reason: 'Must have a selected subcontractor to confirm hire',
    };
  }

  if (newStatus === 'completed' && currentStatus !== 'confirmed') {
    return {
      allowed: false,
      reason: 'Can only mark confirmed jobs as completed',
    };
  }

  return { allowed: true };
}

export function getApplicationStatus(
  applicationStatus: ApplicationStatus,
  jobStatus: JobStatus
): { display: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'error' } {
  if (jobStatus === 'cancelled') {
    return { display: 'Job Cancelled', variant: 'error' };
  }

  if (jobStatus === 'completed') {
    return { display: 'Job Completed', variant: 'success' };
  }

  switch (applicationStatus) {
    case 'applied':
      return { display: 'Application Submitted', variant: 'default' };
    case 'selected':
      return { display: 'Selected - Awaiting Response', variant: 'warning' };
    case 'accepted':
      return { display: 'Accepted - Pending Confirmation', variant: 'success' };
    case 'declined':
      return { display: 'Declined', variant: 'error' };
    case 'confirmed':
      return { display: 'Confirmed', variant: 'success' };
    case 'completed':
      return { display: 'Completed', variant: 'success' };
    default:
      return { display: applicationStatus, variant: 'default' };
  }
}

export function canWithdrawApplication(
  applicationStatus: ApplicationStatus,
  jobStatus: JobStatus
): boolean {
  if (jobStatus === 'cancelled' || jobStatus === 'completed' || jobStatus === 'closed') {
    return false;
  }

  return applicationStatus === 'applied';
}

export function getHoursUntilStart(job: Job): number {
  if (!job.dates || job.dates.length === 0) {
    return 0;
  }

  const startDate = new Date(job.dates[0]);
  if (job.startTime) {
    const [hours, minutes] = job.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }

  const now = new Date();
  const hoursUntil = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  return Math.max(0, hoursUntil);
}
