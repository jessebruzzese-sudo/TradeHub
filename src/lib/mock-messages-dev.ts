/**
 * DEV ONLY: remove once messaging UX polish is complete.
 *
 * Mock conversation and messages for the Messages page when no real conversations exist.
 * Used only in development (NODE_ENV === 'development') for UI polish.
 * Nothing is persisted to Supabase.
 */

export const MOCK_CONVERSATION_ID = 'mock-conv-demo';
const MOCK_OTHER_USER_ID = 'mock-jake-plumbing';
export const MOCK_JOB_ID = 'mock-job-demo';

const MOCK_MESSAGES_RAW = [
  { text: 'Hey mate, are you available next Tuesday for a rough-in?', fromOther: true },
  { text: 'Yes, I should be free after 10am. What suburb is the project in?', fromOther: false },
  { text: 'Cranbourne. Small bathroom reno, should only be a day.', fromOther: true },
  { text: 'Sounds good, send through the details.', fromOther: false },
];

/** Timestamps spread over ~2 hours for realism */
const MOCK_TIMESTAMPS = [
  '2025-03-05T09:15:00.000Z',
  '2025-03-05T09:22:00.000Z',
  '2025-03-05T09:35:00.000Z',
  '2025-03-05T10:48:00.000Z',
];

export interface MockConversationShape {
  id: string;
  contractorId: string;
  subcontractorId: string;
  jobId: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: { id: string; senderId: string; text: string; isSystemMessage: boolean; createdAt: string } | null;
  jobTitle: string | null;
  jobStatus: string | null;
  updatedAt: string;
}

export interface MockMessageShape {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  isSystemMessage: boolean;
  createdAt: string;
}

export interface MockJobShape {
  id: string;
  contractorId: string;
  title: string;
  status: string;
  selectedSubcontractor: string | null;
  confirmedSubcontractor: string | null;
  cancellationReason: string | null;
  applications: Array<{ id: string; subcontractorId: string; status: string }>;
}

export function createMockConversation(currentUserId: string): MockConversationShape {
  const otherId = MOCK_OTHER_USER_ID;
  // Jake Plumbing is the contractor; current user is the subcontractor
  const contractorId = otherId;
  const subcontractorId = currentUserId;
  const lastMsg = MOCK_MESSAGES_RAW[MOCK_MESSAGES_RAW.length - 1];
  const lastTimestamp = MOCK_TIMESTAMPS[MOCK_TIMESTAMPS.length - 1];

  return {
    id: MOCK_CONVERSATION_ID,
    contractorId,
    subcontractorId,
    jobId: MOCK_JOB_ID,
    otherUserId: otherId,
    otherUserName: 'Jake Plumbing Pty Ltd',
    otherUserAvatar: null,
    lastMessage: {
      id: 'mock-msg-last',
      senderId: lastMsg.fromOther ? otherId : currentUserId,
      text: lastMsg.text,
      isSystemMessage: false,
      createdAt: lastTimestamp,
    },
    jobTitle: 'Bathroom Renovation Rough-In',
    jobStatus: 'open',
    updatedAt: lastTimestamp,
  };
}

export function createMockMessages(conversationId: string, currentUserId: string): MockMessageShape[] {
  const otherId = MOCK_OTHER_USER_ID;
  return MOCK_MESSAGES_RAW.map((m, i) => ({
    id: `mock-msg-${i}`,
    conversationId,
    senderId: m.fromOther ? otherId : currentUserId,
    text: m.text,
    isSystemMessage: false,
    createdAt: MOCK_TIMESTAMPS[i],
  }));
}

export function createMockJob(currentUserId: string): MockJobShape {
  return {
    id: MOCK_JOB_ID,
    contractorId: MOCK_OTHER_USER_ID,
    title: 'Bathroom Renovation Rough-In',
    status: 'open',
    selectedSubcontractor: null,
    confirmedSubcontractor: null,
    cancellationReason: null,
    applications: [{ id: 'mock-app-1', subcontractorId: currentUserId, status: 'pending' }],
  };
}

export function isMockConversation(id: string | null): id is string {
  return id === MOCK_CONVERSATION_ID;
}
