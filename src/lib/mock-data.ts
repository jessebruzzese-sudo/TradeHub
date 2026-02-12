/**
 * mock-data.ts
 *
 * Development-only mock data. All exports are guarded behind a NODE_ENV check
 * so production builds never ship fake users, jobs, or demo content.
 *
 * In production every export resolves to an empty array / null / empty object,
 * ensuring no mock names ever reach users.
 */

import { User, Job, Application, Message, Conversation } from './types';

// ── Production-safe empty exports ──────────────────────────────────────────
// These are always available and type-safe, regardless of environment.

const emptyMockData = {
  users: [] as User[],
  jobs: [] as Job[],
  applications: [] as Application[],
  conversations: [] as Conversation[],
  messages: [] as Message[],
  reviews: [] as any[],
  auditLogs: [] as any[],
  adminNotes: [] as any[],
};

// ── Development-only data ──────────────────────────────────────────────────

function buildDevData() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const devCurrentUser: User = {
    id: 'user-1',
    name: 'Dev User',
    email: 'dev@localhost',
    role: 'contractor',
    trustStatus: 'verified',
    rating: 4.8,
    reliabilityRating: 4.9,
    completedJobs: 12,
    memberSince: new Date('2023-01-15'),
    businessName: 'Dev Construction',
    abn: '00000000000',
    primaryTrade: 'Carpenter',
    createdAt: new Date('2023-01-15'),
  };

  const devUsers: User[] = [devCurrentUser];

  const devJobs: Job[] = [
    {
      id: 'job-1',
      contractorId: 'user-1',
      title: 'Dev Job – Electrical Rewire',
      description: 'Development-only test job.',
      tradeCategory: 'Electrician',
      location: 'Dev Location',
      postcode: '0000',
      dates: [tomorrow, new Date(tomorrow.getTime() + 86400000)],
      startTime: '08:00',
      duration: 2,
      payType: 'fixed',
      rate: 2400,
      status: 'open',
      createdAt: now,
    },
    {
      id: 'job-2',
      contractorId: 'user-1',
      title: 'Dev Job – Plumbing Install',
      description: 'Development-only test job.',
      tradeCategory: 'Plumber',
      location: 'Dev Location',
      postcode: '0000',
      dates: [in3Days],
      startTime: '09:00',
      duration: 1,
      payType: 'hourly',
      rate: 85,
      status: 'open',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  const devApplications: Application[] = [];
  const devConversations: Conversation[] = [];
  const devMessages: Message[] = [];

  return {
    currentUser: devCurrentUser,
    users: devUsers,
    jobs: devJobs,
    applications: devApplications,
    conversations: devConversations,
    messages: devMessages,
    reviews: [] as any[],
    auditLogs: [] as any[],
    adminNotes: [] as any[],
    demoUsers: {} as Record<string, any>,
  };
}

// ── Exported API (safe for all environments) ───────────────────────────────

const isDev = process.env.NODE_ENV === 'development';
const dev = isDev ? buildDevData() : null;

export const mockCurrentUser: User | null = dev?.currentUser ?? null;
export const demoUsers: Record<string, any> = dev?.demoUsers ?? {};
export const mockUsers: User[] = dev?.users ?? [];
export const mockJobs: Job[] = dev?.jobs ?? [];
export const mockApplications: Application[] = dev?.applications ?? [];
export const mockConversations: Conversation[] = dev?.conversations ?? [];
export const mockMessages: Message[] = dev?.messages ?? [];
export const mockReviews: any[] = dev?.reviews ?? [];
export const mockData = isDev
  ? {
      users: dev!.users,
      jobs: dev!.jobs,
      applications: dev!.applications,
      conversations: dev!.conversations,
      messages: dev!.messages,
      reviews: dev!.reviews,
      auditLogs: dev!.auditLogs,
      adminNotes: dev!.adminNotes,
    }
  : { ...emptyMockData };
