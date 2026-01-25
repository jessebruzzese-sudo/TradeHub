import { AuditLog, AuditActionType, User, Job } from './types';

export interface AdminSafeguard {
  canAccess: boolean;
  reason?: string;
}

export function canAdminAccessMessaging(user: User | null): AdminSafeguard {
  if (!user) {
    return { canAccess: false, reason: 'User not found' };
  }

  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot participate in job messaging. This is a contractor/subcontractor feature.',
    };
  }

  return { canAccess: true };
}

export function canAdminApplyToJob(user: User | null): AdminSafeguard {
  if (!user) {
    return { canAccess: false, reason: 'User not found' };
  }

  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot apply to jobs. This is a subcontractor feature.',
    };
  }

  return { canAccess: true };
}

export function canAdminPostJob(user: User | null): AdminSafeguard {
  if (!user) {
    return { canAccess: false, reason: 'User not found' };
  }

  if (user.role === 'admin') {
    return {
      canAccess: false,
      reason: 'Admins cannot post jobs. This is a contractor feature.',
    };
  }

  return { canAccess: true };
}

export function createAuditLog(
  adminId: string,
  actionType: AuditActionType,
  details: string,
  metadata?: {
    targetUserId?: string;
    targetJobId?: string;
    targetReviewId?: string;
    additionalData?: Record<string, any>;
  }
): AuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    adminId,
    actionType,
    targetUserId: metadata?.targetUserId,
    targetJobId: metadata?.targetJobId,
    targetReviewId: metadata?.targetReviewId,
    details,
    metadata: metadata?.additionalData,
    createdAt: new Date(),
  };
}

export function getAuditActionLabel(actionType: AuditActionType): string {
  const labels: Record<AuditActionType, string> = {
    user_verification_approved: 'User Verification Approved',
    user_verification_rejected: 'User Verification Declined',
    user_suspended: 'Account Placed on Hold',
    user_unsuspended: 'Account Hold Removed',
    review_approved: 'Review Approved',
    review_rejected: 'Review Declined',
    admin_note_added: 'Admin Note Added',
    job_viewed: 'Job Viewed',
    reliability_event_created: 'Reliability Event Created',
    admin_review_case_created: 'Admin Review Case Created',
    admin_review_case_resolved: 'Admin Review Case Resolved',
    reliability_warning_issued: 'Reliability Warning Issued',
    account_flagged_for_review: 'Account Flagged for Review',
    abn_verified: 'ABN Verified',
    abn_rejected: 'ABN Rejected',
  };

  return labels[actionType] || actionType;
}

export function getAuditActionColor(actionType: AuditActionType): string {
  const colors: Record<AuditActionType, string> = {
    user_verification_approved: 'text-green-700 bg-green-50',
    user_verification_rejected: 'text-orange-700 bg-orange-50',
    user_suspended: 'text-orange-700 bg-orange-50',
    user_unsuspended: 'text-green-700 bg-green-50',
    review_approved: 'text-green-700 bg-green-50',
    review_rejected: 'text-orange-700 bg-orange-50',
    admin_note_added: 'text-blue-700 bg-blue-50',
    job_viewed: 'text-gray-700 bg-gray-50',
    reliability_event_created: 'text-red-700 bg-red-50',
    admin_review_case_created: 'text-orange-700 bg-orange-50',
    admin_review_case_resolved: 'text-green-700 bg-green-50',
    reliability_warning_issued: 'text-orange-700 bg-orange-50',
    account_flagged_for_review: 'text-red-700 bg-red-50',
    abn_verified: 'text-green-700 bg-green-50',
    abn_rejected: 'text-orange-700 bg-orange-50',
  };

  return colors[actionType] || 'text-gray-700 bg-gray-50';
}

export interface JobTimeline {
  timestamp: Date;
  event: string;
  description: string;
  actor?: string;
  type: 'status' | 'application' | 'message' | 'cancellation' | 'completion';
}

export function buildJobTimeline(
  job: Job,
  applications: any[],
  messages: any[],
  users: User[]
): JobTimeline[] {
  const timeline: JobTimeline[] = [];

  timeline.push({
    timestamp: job.createdAt,
    event: 'Job Posted',
    description: `Job "${job.title}" was posted`,
    actor: users.find((u) => u.id === job.contractorId)?.name,
    type: 'status',
  });

  applications.forEach((app) => {
    timeline.push({
      timestamp: app.createdAt,
      event: 'Application Received',
      description: `Application received from ${users.find((u) => u.id === app.subcontractorId)?.name || 'Unknown'}`,
      actor: users.find((u) => u.id === app.subcontractorId)?.name,
      type: 'application',
    });

    if (app.respondedAt) {
      timeline.push({
        timestamp: app.respondedAt,
        event: `Application ${app.status}`,
        description: `Application was ${app.status}`,
        actor: users.find((u) => u.id === app.subcontractorId)?.name,
        type: 'application',
      });
    }
  });

  const firstMessage = messages[0];
  if (firstMessage) {
    timeline.push({
      timestamp: firstMessage.createdAt,
      event: 'Messaging Started',
      description: 'First message sent',
      actor: users.find((u) => u.id === firstMessage.senderId)?.name,
      type: 'message',
    });
  }

  if (job.status === 'accepted' || job.status === 'confirmed') {
    const selectedApp = applications.find((a) => a.subcontractorId === job.selectedSubcontractor);
    if (selectedApp) {
      timeline.push({
        timestamp: selectedApp.createdAt,
        event: 'Subcontractor Selected',
        description: `${users.find((u) => u.id === job.selectedSubcontractor)?.name || 'Unknown'} was selected`,
        actor: users.find((u) => u.id === job.contractorId)?.name,
        type: 'status',
      });
    }
  }

  if (job.status === 'accepted' || job.status === 'confirmed') {
    timeline.push({
      timestamp: new Date(),
      event: 'Job Accepted',
      description: 'Subcontractor accepted the job',
      actor: users.find((u) => u.id === job.selectedSubcontractor)?.name,
      type: 'status',
    });
  }

  if (job.status === 'confirmed') {
    timeline.push({
      timestamp: new Date(),
      event: 'Job Confirmed',
      description: 'Contractor confirmed the hire',
      actor: users.find((u) => u.id === job.contractorId)?.name,
      type: 'status',
    });
  }

  if (job.status === 'cancelled' && job.cancelledAt) {
    const cancelledBy = users.find((u) => u.id === job.cancelledBy);
    timeline.push({
      timestamp: job.cancelledAt,
      event: 'Job Cancelled',
      description: `Cancelled by ${cancelledBy?.name || 'Unknown'}: ${job.cancellationReason || 'No reason provided'}`,
      actor: cancelledBy?.name,
      type: 'cancellation',
    });
  }

  if (job.status === 'completed') {
    timeline.push({
      timestamp: new Date(),
      event: 'Job Completed',
      description: 'Job marked as completed',
      actor: users.find((u) => u.id === job.contractorId)?.name,
      type: 'completion',
    });
  }

  return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
