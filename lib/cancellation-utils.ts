import { Job } from './types';

export function isLateCancellation(job: Job): boolean {
  if (!job.cancelledAt || !job.dates || job.dates.length === 0) {
    return false;
  }

  if (!job.wasAcceptedOrConfirmedBeforeCancellation) {
    return false;
  }

  const startDate = job.dates[0];
  if (job.startTime) {
    const [hours, minutes] = job.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }

  const hoursBeforeStart = (startDate.getTime() - job.cancelledAt.getTime()) / (1000 * 60 * 60);

  return hoursBeforeStart < 24;
}

export function canLeaveReliabilityReview(job: Job, userId: string): boolean {
  if (job.status !== 'cancelled') {
    return false;
  }

  if (!isLateCancellation(job)) {
    return false;
  }

  const isContractor = job.contractorId === userId;
  const isSubcontractor = job.confirmedSubcontractor === userId || job.selectedSubcontractor === userId;

  return isContractor || isSubcontractor;
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

export function willBeLateCancellation(job: Job): boolean {
  const hoursUntil = getHoursUntilStart(job);
  return hoursUntil < 24 && (job.status === 'accepted' || job.status === 'confirmed');
}
