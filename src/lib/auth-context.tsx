'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-client';

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type Availability = Record<Day, boolean>;

type DbUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  trust_status: string | null;
  avatar: string | null;
  bio: string | null;
  rating: number | null;
  reliability_rating: number | null;
};

export type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;

  trustStatus?: string | null;

  avatar?: string | null;
  bio?: string | null;

  rating?: number | null;
  reliabilityRating?: number | null;

  // App-expected extras (not in DB yet)
  primaryTrade?: string | null;
  location?: string | null;
  postcode?: string | null;

  abn?: string | null;
  businessName?: string | null;
  abnStatus?: string | null;

  trades?: string[];
  additionalTrades?: string[];

  completedJobs?: number | null;
  memberSince?: string | null;
  createdAt?: string | null;

  additionalTradesUnlocked?: boolean;
};

type SignupExtras = {
  businessName?: string;
  abn?: string;
  location?: string;
  postcode?: string;
  availability?: Availability;
  role?: string;
  trades?: string[];
  additionalTrades?: string[];
};

type UpdateUserInput = Partial<
  Pick<
    CurrentUser,
    | 'name'
    | 'role'
    | 'bio'
    | 'avatar'
    | 'primaryTrade'
    | 'location'
    | 'postcode'
    | 'businessName'
    | 'abn'
    | 'abnStatus'
    | 'trades'
    | 'additionalTrades'
  >
>;

type AuthCtx = {
  session: Session | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    primaryTrade: string,
    extras?: SignupExtras
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: UpdateUserInput) => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeAbn(input?: string) {
  return (input || '').replace(/\s+/g, '');
}

function mapDbToUi(row: DbUserRow): CurrentUser {
  return {
    id: row.id,
    email: row.email ?? null,
    name: row.name ?? null,
    role: row.role ?? null,
    trustStatus: row.trust_status ?? null,
    avatar: row.avatar ?? null,
    bio: row.bio ?? null,
    rating: row.rating ?? null,
    reliabilityRating: row.reliability_rating ?? null,

    // app extras (not persisted yet)
    primaryTrade: null,
    location: null,
    postcode: null,
    abn: null,
    businessName: null,
    abnStatus: null,
    trades: undefined,
    additionalTrades: undefined,
    completedJobs: null,
    memberSince: null,
    createdAt: null,
    additionalTradesUnlocked: false,
  };
}

function mapUiPatchToDb(patch: UpdateUserInput): Partial<DbUserRow> {
  const out: Partial<DbUserRow> = {};
  if (patch.name !== undefined) out.name = patch.name ?? null;
  if (patch.role !== undefined) out.role = patch.role ?? null;
  if (patch.bio !== undefined) out.bio = patch.bio ?? null;
  if (patch.avatar !== undefined) out.avatar = patch.avatar ?? null;
  return out;
}

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase() as any, []);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // used to ignore stale async completions
  const seqRef = useRef(0);

  const loadProfile = useCallback(
    async (userId: string): Promise<CurrentUser | null> => {
      const { data, error } = await (supabase.from('users') as any)
        .select('id,email,name,role,trust_status,avatar,bio,rating,reliability_rating')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('loadProfile error', error);
        return null;
      }
      if (!data) return null;

      return mapDbToUi(data as DbUserRow);
    },
    [supabase]
  );

  const ensureProfileRow = useCallback(
    async (user: User): Promise<void> => {
      const userId = user?.id;
      if (!userId) return;

      const existing = await loadProfile(userId);
      if (existing) {
        setCurrentUser(existing);
        return;
      }

      const payload: Partial<DbUserRow> = {
        id: userId,
        email: user.email ?? null,
        name:
          (user.user_metadata?.name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          null,
        role: (user.user_metadata?.role as string | undefined) ?? null,
        trust_status: 'pending',
        avatar: null,
        bio: null,
        rating: null,
        reliability_rating: null,
      };

      const { error: upsertErr } = await (supabase.from('users') as any).upsert(payload, {
        onConflict: 'id',
      });

      if (upsertErr) {
        console.error('ensureProfileRow upsert error', upsertErr);
        return;
      }

      const profile = await loadProfile(userId);
      setCurrentUser(profile);
    },
    [loadProfile, supabase]
  );

  /**
   * IMPORTANT:
   * applySession no longer blocks isLoading. It sets session immediately,
   * then loads/ensures profile in the background.
   */
  const applySession = useCallback(
    (next: Session | null) => {
      const seq = ++seqRef.current;

      setSession(next ?? null);

      const user = next?.user ?? null;
      if (!user) {
        setCurrentUser(null);
        return;
      }

      // background profile ensure/load (ignore stale completions)
      (async () => {
        try {
          await ensureProfileRow(user);
        } finally {
          if (seq !== seqRef.current) return;
        }
      })();
    },
    [ensureProfileRow]
  );

  const refreshUser = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setCurrentUser(null);
      return;
    }
    const seq = ++seqRef.current;
    const profile = await loadProfile(userId);
    if (seq !== seqRef.current) return;
    setCurrentUser(profile);
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('getSession error', error);
        if (!alive) return;

        applySession((data?.session as Session) ?? null);
      } catch (e) {
        console.error('auth boot error', e);
        if (!alive) return;
        setSession(null);
        setCurrentUser(null);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, nextSession: any) => {
      if (!alive) return;
      applySession((nextSession as Session) ?? null);
      // never block UI waiting for profile
      setIsLoading(false);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [applySession, supabase]);

  const login: AuthCtx['login'] = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        applySession((data?.session as Session) ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, supabase]
  );

  const signup: AuthCtx['signup'] = useCallback(
    async (name, email, password, primaryTrade, extras = {}) => {
      setIsLoading(true);
      try {
        const cleanedAbn = extras.abn ? normalizeAbn(extras.abn) : '';

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: extras.role ?? null,
              primaryTrade: primaryTrade ?? null,
              businessName: extras.businessName ?? null,
              abn: cleanedAbn || null,
              location: extras.location ?? null,
              postcode: extras.postcode ?? null,
              trades: extras.trades ?? null,
              additionalTrades: extras.additionalTrades ?? null,
            },
          },
        });
        if (error) throw error;

        // Apply session immediately (may be null if email confirm ON)
        applySession((data?.session as Session) ?? null);

        // Best-effort: ensure profile row exists even if session is null
        if (data?.user) {
          await ensureProfileRow(data.user);
        }

        // Merge extras into in-memory currentUser so UI doesn't break
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                primaryTrade: primaryTrade ?? prev.primaryTrade ?? null,
                location: extras.location ?? prev.location ?? null,
                postcode: extras.postcode ?? prev.postcode ?? null,
                businessName: extras.businessName ?? prev.businessName ?? null,
                abn: cleanedAbn || prev.abn || null,
                abnStatus: cleanedAbn ? 'pending' : prev.abnStatus ?? null,
                trades: extras.trades ?? prev.trades,
                additionalTrades: extras.additionalTrades ?? prev.additionalTrades,
                additionalTradesUnlocked:
                  Array.isArray(extras.additionalTrades) && extras.additionalTrades.length > 0
                    ? true
                    : prev.additionalTradesUnlocked ?? false,
              }
            : prev
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, ensureProfileRow, supabase]
  );

  const updateUser: AuthCtx['updateUser'] = useCallback(
    async (patch) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const dbPatch = mapUiPatchToDb(patch);
      if (Object.keys(dbPatch).length > 0) {
        const { error } = await (supabase.from('users') as any).update(dbPatch).eq('id', userId);
        if (error) throw error;
      }

      // Merge all fields in-memory (until DB columns exist)
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const merged: CurrentUser = { ...prev, ...patch };
        if (patch.abn !== undefined) merged.abn = patch.abn ? normalizeAbn(patch.abn) : null;
        merged.additionalTradesUnlocked =
          Array.isArray(merged.additionalTrades) && merged.additionalTrades.length > 0;
        return merged;
      });

      await refreshUser();
    },
    [refreshUser, session?.user?.id, supabase]
  );

  const logout: AuthCtx['logout'] = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('signOut error', error);
        applySession(null);
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, supabase]
  );

  const value: AuthCtx = useMemo(
    () => ({
      session,
      currentUser,
      isLoading,
      login,
      signup,
      logout,
      refreshUser,
      updateUser,
    }),
    [session, currentUser, isLoading, login, signup, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthContextProvider>');
  return ctx;
}

export const AuthProvider = AuthContextProvider;
export default useAuth;
