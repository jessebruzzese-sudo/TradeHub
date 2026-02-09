import { Job, JobStatus, Message } from './types';

export interface MessagingState {
  canSendMessages: boolean;
  isReadOnly: boolean;
  disabledReason?: string;
  statusInfo?: string;
}

export function getMessagingState(
  job: Job | null,
  currentUser: { trustStatus?: string | null } | null
): MessagingState {
  if (!job || !currentUser) {
    return {
      canSendMessages: false,
      isReadOnly: true,
      disabledReason: 'Unable to load conversation',
    };
  }

  if (currentUser.trustStatus === 'pending') {
    return {
      canSendMessages: false,
      isReadOnly: true,
      disabledReason: 'Your account is pending approval. Messaging will be enabled once approved.',
    };
  }

  if (job.status === 'cancelled') {
    return {
      canSendMessages: false,
      isReadOnly: true,
      disabledReason: 'This job has been cancelled. Messaging is now read-only.',
      statusInfo: 'Job Cancelled',
    };
  }

  if (job.status === 'completed') {
    return {
      canSendMessages: false,
      isReadOnly: true,
      disabledReason: 'This job has been completed. Messaging is now read-only.',
      statusInfo: 'Job Completed',
    };
  }

  if (job.status === 'closed') {
    return {
      canSendMessages: false,
      isReadOnly: true,
      disabledReason: 'This job posting has been closed. Messaging is now read-only.',
      statusInfo: 'Job Closed',
    };
  }

  return {
    canSendMessages: true,
    isReadOnly: false,
  };
}

export function createSystemMessage(
  conversationId: string,
  jobStatus: JobStatus,
  additionalInfo?: string
): Message {
  const statusMessages: Record<JobStatus, string> = {
    open: 'Job reopened for applications',
    accepted: 'Trade business selected for the job',
    confirmed: 'Job confirmed! Both parties are ready to proceed.',
    completed: 'Job has been marked as completed',
    cancelled: `Job has been cancelled${additionalInfo ? `: ${additionalInfo}` : ''}`,
    closed: 'Job posting has been closed',
  };

  return {
    id: `system-${jobStatus}-${Date.now()}`,
    conversationId,
    senderId: 'system',
    text: statusMessages[jobStatus] || 'Job status updated',
    isSystemMessage: true,
    createdAt: new Date(),
  };
}

export function shouldAddSystemMessage(
  existingMessages: Message[],
  jobStatus: JobStatus
): boolean {
  const recentSystemMessages = existingMessages.filter(
    (m) => m.isSystemMessage && m.text.toLowerCase().includes(getStatusKeyword(jobStatus))
  );

  if (recentSystemMessages.length === 0) {
    return true;
  }

  const lastSystemMessage = recentSystemMessages[recentSystemMessages.length - 1];
  const timeSinceLastMessage = Date.now() - lastSystemMessage.createdAt.getTime();
  const fiveMinutes = 5 * 60 * 1000;

  return timeSinceLastMessage > fiveMinutes;
}

function getStatusKeyword(status: JobStatus): string {
  const keywords: Record<JobStatus, string> = {
    open: 'reopened',
    accepted: 'selected',
    confirmed: 'confirmed',
    completed: 'completed',
    cancelled: 'cancelled',
    closed: 'closed',
  };
  return keywords[status] || status;
}

export interface MessageValidation {
  isValid: boolean;
  error?: string;
}

export function validateMessage(text: string): MessageValidation {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (trimmed.length > 5000) {
    return {
      isValid: false,
      error: 'Message is too long (max 5000 characters)',
    };
  }

  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = trimmed.match(urlPattern) || [];
  if (urls.length > 5) {
    return {
      isValid: false,
      error: 'Too many links in message (max 5)',
    };
  }

  return { isValid: true };
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
}

export function createMessage(
  conversationId: string,
  senderId: string,
  text: string
): SendMessageResult {
  const validation = validateMessage(text);

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      text: text.trim(),
      createdAt: new Date(),
      isSystemMessage: false,
    };

    return {
      success: true,
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create message. Please try again.',
    };
  }
}

export function hasMessages(messages: Message[]): boolean {
  return messages.filter((m) => !m.isSystemMessage).length > 0;
}

export function getConversationPreview(messages: Message[]): string {
  const lastUserMessage = messages
    .filter((m) => !m.isSystemMessage)
    .slice(-1)[0];

  if (!lastUserMessage) {
    return 'No messages yet';
  }

  return lastUserMessage.text.length > 50
    ? `${lastUserMessage.text.substring(0, 50)}...`
    : lastUserMessage.text;
}
