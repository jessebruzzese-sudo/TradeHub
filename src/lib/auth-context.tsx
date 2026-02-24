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
import {
  hasSubcontractorPremium,
  hasBuilderPremium,
  hasContractorPremium,
} from '@/lib/capability-utils';

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type Availability = Record<Day, boolean>;

type DbUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  is_admin?: boolean | null;
  trust_status: string | null;
  avatar: string | null;
  bio: string | null;
  rating: number | null;
  reliability_rating: number | null;
  primary_trade?: string | null;
  business_name?: string | null;
  abn?: string | null;
  abn_status?: string | null;
  // Subscription / premium (from users table)
  is_premium?: boolean | null;
  active_plan?: string | null;
  subscription_status?: string | null;
  subscription_renews_at?: string | null;
  subscription_started_at?: string | null;
  subscription_canceled_at?: string | null;
  complimentary_premium_until?: string | null;
  premium_until?: string | null;
  additional_trades_unlocked?: boolean | null;
  additional_trades?: string[] | null;
  search_location?: string | null;
  search_postcode?: string | null;
  search_lat?: number | null;
  search_lng?: number | null;
  is_public_profile?: boolean | null;
};

export type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  /** Role is NOT used for permissions; admin only via isAdmin(). Kept for UI/copy. */
  role?: string | null;
  is_admin?: boolean | null;

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

  /**
   * From DB: premium/capabilities or explicit admin-grant. Do NOT auto-derive from additionalTrades.
   */
  additionalTradesUnlocked?: boolean;

  // Subscription / premium (from DB)
  isPremium?: boolean | null;
  activePlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionRenewsAt?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionCanceledAt?: string | null;
  complimentaryPremiumUntil?: string | null;
  premiumUntil?: string | null;

  // Premium "search-from" location (from DB)
  searchLocation?: string | null;
  searchPostcode?: string | null;
  searchLat?: number | null;
  searchLng?: number | null;

  /** When true, profile appears in Trades near you discovery. */
  isPublicProfile?: boolean;
}

type SignupExtras = {
  businessName?: string;
  abn?: string;
  location?: string;
  postcode?: string;
  availability?: Record<string, boolean>;
  role?: string;
  trades?: string[];
  additionalTrades?: string[];
  /** Full trade selection (1 for free, up to 5 for premium). TODO: migrate backend to use this. */
  tradeCategories?: string[];
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
    | 'searchLocation'
    | 'searchPostcode'
    | 'searchLat'
    | 'searchLng'
    | 'isPublicProfile'
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

function normalizeSubscriptionStatus(s?: string | null): string | null {
  const v = (s || '').trim().toUpperCase();
  if (!v) return null;
  if (['NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED'].includes(v)) return v;
  return v as string;
}

function normalizeActivePlan(s?: string | null): string | null {
  const v = (s || '').trim().toUpperCase();
  if (!v) return null;
  if (['NONE', 'BUSINESS_PRO_20', 'SUBCONTRACTOR_PRO_10', 'ALL_ACCESS_PRO_26'].includes(v)) return v;
  return v as string;
}

function mapDbToUi(row: DbUserRow): CurrentUser {
  return {
    id: row.id,
    email: row.email ?? null,
    name: row.name ?? null,
    role: row.role ?? null,
    is_admin: row.is_admin ?? false,
    trustStatus: row.trust_status ?? null,
    avatar: row.avatar ?? null,
    bio: row.bio ?? null,
    rating: row.rating ?? null,
    reliabilityRating: row.reliability_rating ?? null,

    primaryTrade: row.primary_trade ?? null,
    location: null,
    postcode: null,
    abn: row.abn ?? null,
    businessName: row.business_name ?? null,
    abnStatus: (row.abn_status ? (String(row.abn_status).toUpperCase() as CurrentUser['abnStatus']) : null),
    trades: undefined,
    additionalTrades: undefined,
    completedJobs: null,
    memberSince: null,
    createdAt: null,

    additionalTradesUnlocked: row.additional_trades_unlocked === true,

    isPremium: row.is_premium === true,
    activePlan: normalizeActivePlan(row.active_plan) ?? null,
    subscriptionStatus: normalizeSubscriptionStatus(row.subscription_status) ?? null,
    subscriptionRenewsAt: row.subscription_renews_at ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionCanceledAt: row.subscription_canceled_at ?? null,
    complimentaryPremiumUntil: row.complimentary_premium_until ?? null,
    premiumUntil: row.premium_until ?? null,

    searchLocation: row.search_location ?? null,
    searchPostcode: row.search_postcode ?? null,
    searchLat: row.search_lat != null ? Number(row.search_lat) : null,
    searchLng: row.search_lng != null ? Number(row.search_lng) : null,

    isPublicProfile: row.is_public_profile === true,
  };
}

function mapUiPatchToDb(patch: UpdateUserInput): Partial<DbUserRow> {
  const out: Partial<DbUserRow> = {};
  if (patch.name !== undefined) out.name = patch.name ?? null;
  if (patch.role !== undefined) out.role = patch.role ?? null;
  if (patch.bio !== undefined) out.bio = patch.bio ?? null;
  if (patch.avatar !== undefined) out.avatar = patch.avatar ?? null;
  if (patch.primaryTrade !== undefined) out.primary_trade = patch.primaryTrade ?? null;
  if (patch.businessName !== undefined) out.business_name = patch.businessName ?? null;
  if (patch.abn !== undefined) out.abn = patch.abn ?? null;
  if (patch.abnStatus !== undefined) out.abn_status = patch.abnStatus ?? null;
  if (patch.additionalTrades !== undefined) out.additional_trades = patch.additionalTrades ?? null;
  if (patch.searchLocation !== undefined) out.search_location = patch.searchLocation ?? null;
  if (patch.searchPostcode !== undefined) out.search_postcode = patch.searchPostcode ?? null;
  if (patch.searchLat !== undefined) out.search_lat = patch.searchLat ?? null;
  if (patch.searchLng !== undefined) out.search_lng = patch.searchLng ?? null;
  if (patch.isPublicProfile !== undefined) out.is_public_profile = patch.isPublicProfile ?? false;
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
      try {
        const { data, error } = await (supabase.from('users') as any)
          .select(
            'id,email,name,role,is_admin,trust_status,avatar,bio,rating,reliability_rating,primary_trade,business_name,abn,abn_status,' +
              'is_premium,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,' +
              'complimentary_premium_until,premium_until,additional_trades_unlocked,search_location,search_postcode,search_lat,search_lng,' +
              'is_public_profile'
          )
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('loadProfile error', error);
          return null;
        }
        if (!data) return null;

        return mapDbToUi(data as DbUserRow);
      } catch (e) {
        console.error('loadProfile unexpected error', e);
        return null;
      }
    },
    [supabase]
  );

  const ensureProfileRow = useCallback(
    async (user: User): Promise<void> => {
      const userId = user?.id;
      if (!userId) return;

      try {
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
      } catch (e) {
        console.error('ensureProfileRow unexpected error', e);
      }
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
              // TODO: migrate trigger to use trade_categories; for now primary_trade = first
              trade_categories: extras.tradeCategories ?? null,
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
                trades: extras.tradeCategories ?? extras.trades ?? prev.trades,
                additionalTrades: extras.additionalTrades ?? prev.additionalTrades,

                /**
                 * IMPORTANT:
                 * Do NOT auto-unlock multi-trade based on stored additionalTrades.
                 * Unlocking should come from Premium/capabilities (or explicit admin grant).
                 */
                additionalTradesUnlocked: prev.additionalTradesUnlocked ?? false,
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

      // Enforce premium rules using current in-memory user (before DB or merge)
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const canMultiTrade = hasSubcontractorPremium(prev) || prev.additionalTradesUnlocked === true;
        const canCustomSearch = hasBuilderPremium(prev) || hasContractorPremium(prev);

        if (patch.additionalTrades !== undefined && !canMultiTrade) {
          throw new Error('Additional trades require Premium');
        }
        const hasSearchPatch =
          patch.searchLocation !== undefined ||
          patch.searchPostcode !== undefined ||
          patch.searchLat !== undefined ||
          patch.searchLng !== undefined;
        if (hasSearchPatch && !canCustomSearch) {
          throw new Error('Custom search location requires Premium');
        }
        return prev;
      });

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

        /**
         * IMPORTANT:
         * Do NOT auto-unlock multi-trade based on stored additionalTrades.
         * Keep the prior value unless a dedicated upgrade/admin flow sets it.
         */
        merged.additionalTradesUnlocked = prev.additionalTradesUnlocked ?? false;

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
