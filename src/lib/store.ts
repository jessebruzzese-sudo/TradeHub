import { User, Job, Application, Conversation, Message, Review, AuditLog, AdminNote } from './types';
// mockData is environment-guarded: returns empty arrays in production, dev data only in development.
import { mockData } from './mock-data';

export interface AppStore {
  currentUser: User | null;
  users: User[];
  jobs: Job[];
  applications: Application[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Review[];
  auditLogs: AuditLog[];
  adminNotes: AdminNote[];
  setCurrentUser: (user: User | null) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  createJob: (job: Job) => void;
  createApplication: (app: Application) => void;
  updateApplication: (appId: string, updates: Partial<Application>) => void;
  addMessage: (message: Message) => void;
  createReview: (review: Review) => void;
  updateReview: (reviewId: string, updates: Partial<Review>) => void;
  getUserById: (id: string) => User | undefined;
  getJobById: (id: string) => Job | undefined;
  getApplicationById: (id: string) => Application | undefined;
  getConversationById: (id: string) => Conversation | undefined;
  getJobsByContractor: (contractorId: string) => Job[];
  getApplicationsByContractor: (contractorId: string) => Application[];
  getApplicationsByJob: (jobId: string) => Application[];
  getMessagesByConversation: (conversationId: string) => Message[];
  getReviewsByRecipient: (recipientId: string) => Review[];
  getReviewsByJob: (jobId: string) => Review[];
  getPendingReviews: () => Review[];
  addAuditLog: (log: AuditLog) => void;
  getAuditLogs: () => AuditLog[];
  getAuditLogsByUser: (userId: string) => AuditLog[];
  getAuditLogsByJob: (jobId: string) => AuditLog[];
  addAdminNote: (note: AdminNote) => void;
  getAdminNotesByUser: (userId: string) => AdminNote[];
  updateAdminNote: (noteId: string, updates: Partial<AdminNote>) => void;
  markConversationAsRead: (conversationId: string, userId: string) => void;
  getUnreadConversationCount: (userId: string) => number;
  findOrCreateConversation: (jobId: string, contractorId: string, subcontractorId: string) => Conversation;
}

let store: AppStore = {
  currentUser: null,
  users: [...mockData.users],
  jobs: [...mockData.jobs],
  applications: [...mockData.applications],
  conversations: [...mockData.conversations],
  messages: [...mockData.messages],
  reviews: mockData.reviews || [],
  auditLogs: [],
  adminNotes: [],

  setCurrentUser(user) {
    this.currentUser = user;
    if (user && !this.users.find((u) => u.id === user.id)) {
      this.users.push(user);
    }
  },

  updateUser(userId, updates) {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      Object.assign(user, updates);
      if (this.currentUser?.id === userId) {
        this.currentUser = user;
      }
    }
  },

  updateJob(jobId, updates) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
    }
  },

  createJob(job) {
    this.jobs.push(job);
  },

  createApplication(app) {
    this.applications.push(app);
  },

  updateApplication(appId, updates) {
    const app = this.applications.find((a) => a.id === appId);
    if (app) {
      Object.assign(app, updates);
    }
  },

  addMessage(message) {
    this.messages.push(message);
    const conversation = this.conversations.find((c) => c.id === message.conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
    }
  },

  createReview(review) {
    this.reviews.push(review);
  },

  updateReview(reviewId, updates) {
    const review = this.reviews.find((r) => r.id === reviewId);
    if (review) {
      Object.assign(review, updates);
    }
  },

  getUserById(id) {
    return this.users.find((u) => u.id === id);
  },

  getJobById(id) {
    return this.jobs.find((j) => j.id === id);
  },

  getApplicationById(id) {
    return this.applications.find((a) => a.id === id);
  },

  getConversationById(id) {
    return this.conversations.find((c) => c.id === id);
  },

  getJobsByContractor(contractorId) {
    return this.jobs.filter((j) => j.contractorId === contractorId);
  },

  getApplicationsByContractor(contractorId) {
    return this.applications.filter((a) => {
      const job = this.getJobById(a.jobId);
      return job?.contractorId === contractorId;
    });
  },

  getApplicationsByJob(jobId) {
    return this.applications.filter((a) => a.jobId === jobId);
  },

  getMessagesByConversation(conversationId) {
    return this.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  getReviewsByRecipient(recipientId) {
    return this.reviews.filter((r) => r.recipientId === recipientId && r.moderationStatus === 'approved');
  },

  getReviewsByJob(jobId) {
    return this.reviews.filter((r) => r.jobId === jobId);
  },

  getPendingReviews() {
    return this.reviews.filter((r) => r.moderationStatus === 'pending');
  },

  addAuditLog(log) {
    this.auditLogs.push(log);
  },

  getAuditLogs() {
    return this.auditLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getAuditLogsByUser(userId) {
    return this.auditLogs
      .filter((log) => log.targetUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getAuditLogsByJob(jobId) {
    return this.auditLogs
      .filter((log) => log.targetJobId === jobId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  addAdminNote(note) {
    this.adminNotes.push(note);
  },

  getAdminNotesByUser(userId) {
    return this.adminNotes
      .filter((note) => note.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  updateAdminNote(noteId, updates) {
    const note = this.adminNotes.find((n) => n.id === noteId);
    if (note) {
      Object.assign(note, { ...updates, updatedAt: new Date() });
    }
  },

  markConversationAsRead(conversationId, userId) {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      const now = new Date();
      if (conversation.contractorId === userId) {
        conversation.lastReadByContractor = now;
      } else if (conversation.subcontractorId === userId) {
        conversation.lastReadBySubcontractor = now;
      }
    }
  },

  getUnreadConversationCount(userId) {
    return this.conversations.filter((conversation) => {
      const isParticipant = conversation.contractorId === userId || conversation.subcontractorId === userId;
      if (!isParticipant || !conversation.lastMessage) return false;

      const lastReadTime = conversation.contractorId === userId
        ? conversation.lastReadByContractor
        : conversation.lastReadBySubcontractor;

      if (!lastReadTime) return true;

      return conversation.lastMessage.createdAt > lastReadTime;
    }).length;
  },

  findOrCreateConversation(jobId, contractorId, subcontractorId) {
    const existing = this.conversations.find(
      (c) => c.jobId === jobId && c.contractorId === contractorId && c.subcontractorId === subcontractorId
    );

    if (existing) {
      return existing;
    }

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      jobId,
      contractorId,
      subcontractorId,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    this.conversations.push(newConversation);
    return newConversation;
  },
};

export function getStore(): AppStore {
  return store;
}

export function resetStore(): void {
  store = {
    currentUser: null,
    users: [...mockData.users],
    jobs: [...mockData.jobs],
    applications: [...mockData.applications],
    conversations: [...mockData.conversations],
    messages: [...mockData.messages],
    reviews: [...mockData.reviews],
    auditLogs: [],
    adminNotes: [],

    setCurrentUser(user) {
      this.currentUser = user;
      if (user && !this.users.find((u) => u.id === user.id)) {
        this.users.push(user);
      }
    },

    updateUser(userId, updates) {
      const user = this.users.find((u) => u.id === userId);
      if (user) {
        Object.assign(user, updates);
        if (this.currentUser?.id === userId) {
          this.currentUser = user;
        }
      }
    },

    updateJob(jobId, updates) {
      const job = this.jobs.find((j) => j.id === jobId);
      if (job) {
        Object.assign(job, updates);
      }
    },

    createJob(job) {
      this.jobs.push(job);
    },

    createApplication(app) {
      this.applications.push(app);
    },

    updateApplication(appId, updates) {
      const app = this.applications.find((a) => a.id === appId);
      if (app) {
        Object.assign(app, updates);
      }
    },

    addMessage(message) {
      this.messages.push(message);
    },

    createReview(review) {
      this.reviews.push(review);
    },

    updateReview(reviewId, updates) {
      const review = this.reviews.find((r) => r.id === reviewId);
      if (review) {
        Object.assign(review, updates);
      }
    },

    getUserById(id) {
      return this.users.find((u) => u.id === id);
    },

    getJobById(id) {
      return this.jobs.find((j) => j.id === id);
    },

    getApplicationById(id) {
      return this.applications.find((a) => a.id === id);
    },

    getConversationById(id) {
      return this.conversations.find((c) => c.id === id);
    },

    getJobsByContractor(contractorId) {
      return this.jobs.filter((j) => j.contractorId === contractorId);
    },

    getApplicationsByContractor(contractorId) {
      return this.applications.filter((a) => {
        const job = this.getJobById(a.jobId);
        return job?.contractorId === contractorId;
      });
    },

    getApplicationsByJob(jobId) {
      return this.applications.filter((a) => a.jobId === jobId);
    },

    getMessagesByConversation(conversationId) {
      return this.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    getReviewsByRecipient(recipientId) {
      return this.reviews.filter((r) => r.recipientId === recipientId && r.moderationStatus === 'approved');
    },

    getReviewsByJob(jobId) {
      return this.reviews.filter((r) => r.jobId === jobId);
    },

    getPendingReviews() {
      return this.reviews.filter((r) => r.moderationStatus === 'pending');
    },

    addAuditLog(log) {
      this.auditLogs.push(log);
    },

    getAuditLogs() {
      return this.auditLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    getAuditLogsByUser(userId) {
      return this.auditLogs
        .filter((log) => log.targetUserId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    getAuditLogsByJob(jobId) {
      return this.auditLogs
        .filter((log) => log.targetJobId === jobId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    addAdminNote(note) {
      this.adminNotes.push(note);
    },

    getAdminNotesByUser(userId) {
      return this.adminNotes
        .filter((note) => note.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    updateAdminNote(noteId, updates) {
      const note = this.adminNotes.find((n) => n.id === noteId);
      if (note) {
        Object.assign(note, { ...updates, updatedAt: new Date() });
      }
    },

    markConversationAsRead(conversationId, userId) {
      const conversation = this.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        const now = new Date();
        if (conversation.contractorId === userId) {
          conversation.lastReadByContractor = now;
        } else if (conversation.subcontractorId === userId) {
          conversation.lastReadBySubcontractor = now;
        }
      }
    },

    getUnreadConversationCount(userId) {
      return this.conversations.filter((conversation) => {
        const isParticipant = conversation.contractorId === userId || conversation.subcontractorId === userId;
        if (!isParticipant || !conversation.lastMessage) return false;

        const lastReadTime = conversation.contractorId === userId
          ? conversation.lastReadByContractor
          : conversation.lastReadBySubcontractor;

        if (!lastReadTime) return true;

        return conversation.lastMessage.createdAt > lastReadTime;
      }).length;
    },

    findOrCreateConversation(jobId, contractorId, subcontractorId) {
      const existing = this.conversations.find(
        (c) => c.jobId === jobId && c.contractorId === contractorId && c.subcontractorId === subcontractorId
      );

      if (existing) {
        return existing;
      }

      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        jobId,
        contractorId,
        subcontractorId,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      this.conversations.push(newConversation);
      return newConversation;
    },
  };
}
