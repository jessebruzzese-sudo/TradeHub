'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { getBrowserSupabase } from './supabase/browserClient';
import { User } from './types';
import { getStore } from './store';
import { demoUsers } from './mock-data';
import { hardRedirect } from './safe-nav';
import { clearSimulatedPremium } from './billing-sim';

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  session: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: 'contractor' | 'subcontractor',
    primaryTrade: string,
    additionalData?: {
      businessName?: string;
      abn?: string;
      location?: string;
      postcode?: string;
      availability?: { [key: string]: boolean };
    }
  ) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => void;
  quickLogin: (
    role: 'admin' | 'contractor' | 'subcontractor'
  ) => Promise<User | null>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'tradehub_demo_user_id';

function normalizeEmail(value: string) {
  return (value || '').trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRefreshTokenError(err: any) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid refresh token') ||
    msg.includes('invalid refresh_token') ||
    msg.includes('jwt expired')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const store = getStore();
  const supabase = getBrowserSupabase();

  const convertDbUserToUser = useCallback((data: any): User => {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      trustStatus: data.trust_status || 'pending',
      rating: data.rating || 0,
      reliabilityRating: data.reliability_rating,
      completedJobs: data.completed_jobs || 0,
      memberSince: new Date(data.created_at),
      createdAt: new Date(data.created_at),
      primaryTrade: data.primary_trade,
      additionalTrades: data.additional_trades || [],
      additionalTradesUnlocked: data.additional_trades_unlocked || false,
      businessName: data.business_name,
      abn: data.abn,
      bio: data.bio,
      trades: data.trades,
      location: data.location,
      postcode: data.postcode,
      radius: data.radius,
      availability: data.availability,
      avatar: data.avatar,
      subcontractorPlan: data.subcontractor_plan,
      subcontractorSubStatus: data.subcontractor_sub_status,
      subcontractorSubRenewsAt: data.subcontractor_sub_renews_at
        ? new Date(data.subcontractor_sub_renews_at)
        : undefined,
      subcontractorPreferredRadiusKm: data.subcontractor_preferred_radius_km,
      subcontractorAlertsEnabled: data.subcontractor_alerts_enabled,
      subcontractorAlertChannelInApp: data.subcontractor_alert_channel_in_app,
      subcontractorAlertChannelEmail: data.subcontractor_alert_channel_email,
      subcontractorAlertChannelSms: data.subcontractor_alert_channel_sms,
      subcontractorAvailabilityHorizonDays:
        data.subcontractor_availability_horizon_days,
      subcontractorWorkAlertsEnabled: data.subcontractor_work_alerts_enabled,
      subcontractorWorkAlertInApp: data.subcontractor_work_alert_in_app,
      subcontractorWorkAlertEmail: data.subcontractor_work_alert_email,
      subcontractorWorkAlertSms: data.subcontractor_work_alert_sms,
      subcontractorAvailabilityBroadcastEnabled:
        data.subcontractor_availability_broadcast_enabled,
      smsOptInPromptShown: data.sms_opt_in_prompt_shown,
    };
  }, []);

  const clearAllAuthState = useCallback(() => {
    setSession(null);
    setCurrentUser(null);
    store.setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }, [store]);

  const clearSupabaseStorage = useCallback(() => {
    // Defensive cleanup for stale tokens / auth loops
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.toLowerCase().includes('tradehub')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('[Auth] Error clearing storage:', e);
    }
  }, []);

  const loadUserProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error loading user profile:', error.message);
        throw error;
      }

      if (!data) return null;

      const user = convertDbUserToUser(data);
      setCurrentUser(user);
      store.setCurrentUser(user);
      return user;
    },
    [supabase, store, convertDbUserToUser]
  );

  // Init + auth state changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase.auth.getSession();

        if (error && isRefreshTokenError(error)) {
          console.warn('[Auth] Refresh token issue detected, clearing auth');
          try {
            await supabase.auth.signOut();
          } catch {}
          clearSupabaseStorage();
          if (mounted) clearAllAuthState();
          return;
        }

        if (!mounted) return;

        if (data?.session?.user) {
          setSession(data.session);

          // Profile can lag on first run; try twice.
          try {
            await loadUserProfile(data.session.user.id);
          } catch (e) {
            await sleep(400);
            try {
              await loadUserProfile(data.session.user.id);
            } catch (retryErr) {
              console.warn('[Auth] Profile load failed on init:', retryErr);
              if (mounted) clearAllAuthState();
            }
          }
        } else {
          if (mounted) clearAllAuthState();
        }
      } catch (e) {
        console.error('[Auth] Initialization error:', e);
        if (mounted) clearAllAuthState();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: any, authSession: any) => {
        if (!mounted) return;

        console.log('[Auth] State change:', event);

        (async () => {
          try {
            if (event === 'SIGNED_IN' && authSession?.user) {
              setSession(authSession);

              try {
                await loadUserProfile(authSession.user.id);
              } catch (e) {
                // Trigger-created profile can lag; retry once.
                await sleep(500);
                try {
                  await loadUserProfile(authSession.user.id);
                } catch (retryErr) {
                  console.warn('[Auth] Profile still not available:', retryErr);
                }
              }
              return;
            }

            if (event === 'TOKEN_REFRESHED' && authSession) {
              setSession(authSession);
              return;
            }

            if (event === 'SIGNED_OUT' || !authSession) {
              clearAllAuthState();
              return;
            }
          } catch (e) {
            console.error('[Auth] Error during auth state change:', e);
          }
        })();
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile, clearAllAuthState, clearSupabaseStorage]);

  const login = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      setIsLoading(true);
      try {
        const cleanEmail = normalizeEmail(email);

        if (!isValidEmail(cleanEmail)) {
          throw new Error('Please enter a valid email address.');
        }
        if (!password) {
          throw new Error('Please enter your password.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          console.error('[Auth] Supabase login error:', error.message);
          throw error;
        }

        if (data?.user) {
          const user = await loadUserProfile(data.user.id);
          return user;
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, loadUserProfile]
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: 'contractor' | 'subcontractor',
      primaryTrade: string,
      additionalData?: {
        businessName?: string;
        abn?: string;
        location?: string;
        postcode?: string;
        availability?: { [key: string]: boolean };
      }
    ) => {
      setIsLoading(true);
      try {
        const cleanName = (name || '').trim();
        const cleanEmail = normalizeEmail(email);

        console.log(
  'EMAIL SENT TO SUPABASE:',
  JSON.stringify(cleanEmail)
);


        if (!cleanName) throw new Error('Please enter your name.');
        if (!isValidEmail(cleanEmail))
          throw new Error('Please enter a valid email address.');
        if (!password || password.length < 6)
          throw new Error('Password must be at least 6 characters.');
        if (!primaryTrade?.trim())
          throw new Error('Please select a primary trade.');

        // Optional duplicate check (only if RPC exists)
        try {
          const { data: emailExists, error: checkError } = await supabase.rpc(
            'check_email_exists',
            { check_email: cleanEmail }
          );
          if (!checkError && emailExists === true) {
            const duplicateError = new Error('DUPLICATE_EMAIL');
            (duplicateError as any).code = 'DUPLICATE_EMAIL';
            throw duplicateError;
          }
        } catch (e) {
          // If RPC missing, ignore (Supabase will enforce uniqueness anyway)
          console.warn('[Signup] Duplicate check RPC skipped/failed:', e);
        }

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: cleanEmail,
            password,
            options: {
              data: {
                name: cleanName,
                role,
                primary_trade: primaryTrade,
                business_name: additionalData?.businessName || null,
                abn: additionalData?.abn || null,
                location: additionalData?.location || null,
                postcode: additionalData?.postcode || null,
              },
            },
          }
        );

        if (authError) {
          const msg = String(authError.message || '').toLowerCase();
          const code = String((authError as any).code || '').toLowerCase();

          const looksDuplicate =
            msg.includes('already') ||
            msg.includes('exists') ||
            msg.includes('registered') ||
            msg.includes('duplicate') ||
            code.includes('already') ||
            code.includes('exists');

          if (looksDuplicate) {
            const duplicateError = new Error('DUPLICATE_EMAIL');
            (duplicateError as any).code = 'DUPLICATE_EMAIL';
            throw duplicateError;
          }

          throw new Error('Failed to create account. Please try again.');
        }

        if (!authData?.user) {
          throw new Error('Failed to create user account.');
        }

        // If session is present, try to load profile now
        if (authData.session) {
          await sleep(400);

          try {
            await loadUserProfile(authData.user.id);
          } catch {
            // Profile may not exist yet; auth listener will pick it up later.
            console.log('[Signup] Profile not immediately available; will load later.');
          }

          // Save availability if provided
          if (additionalData?.availability) {
            try {
              const { error: updateError } = await supabase
                .from('users')
                .update({ availability: additionalData.availability })
                .eq('id', authData.user.id);

              if (updateError) {
                console.warn('[Signup] Failed to save availability:', updateError);
              }
            } catch (e) {
              console.warn('[Signup] Failed to save availability:', e);
            }
          }
        } else {
          // No session usually = email confirmation required
          console.log('[Signup] User created but no session (email confirmation may be required).');
        }
      } catch (error: any) {
        console.error('[Signup] Error:', error);

        // Preserve DUPLICATE_EMAIL
        if (error && typeof error === 'object' && error.code === 'DUPLICATE_EMAIL') {
          throw error;
        }
        if (error instanceof Error && error.message === 'DUPLICATE_EMAIL') {
          throw error;
        }

        // Preserve friendly validation errors
        if (error instanceof Error) {
          throw error;
        }

        throw new Error('Failed to create account. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, loadUserProfile]
  );

  const logout = useCallback(async () => {
    console.log('[Auth] Logout initiated');
    try {
      clearSimulatedPremium();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[Auth] Supabase signOut error:', e);
    }

    clearAllAuthState();
    clearSupabaseStorage();

    hardRedirect('/login');
  }, [supabase, clearAllAuthState, clearSupabaseStorage]);

  // Demo helpers (kept for compatibility)
  const switchUser = useCallback(
    (userId: string) => {
      const user = store.users.find((u) => u.id === userId);
      if (user) {
        setCurrentUser(user);
        store.setCurrentUser(user);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, user.id);
        } catch {}
      }
    },
    [store]
  );

  const quickLogin = useCallback(
    async (role: 'admin' | 'contractor' | 'subcontractor'): Promise<User | null> => {
      setIsLoading(true);
      try {
        const demoUser = demoUsers[role];
        const user = store.users.find((u) => u.id === demoUser.id);
        if (user) {
          setCurrentUser(user);
          store.setCurrentUser(user);
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, user.id);
          } catch {}
          return user;
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!currentUser) throw new Error('No user logged in');

      const dbUpdates: any = { id: currentUser.id };

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.businessName !== undefined) dbUpdates.business_name = updates.businessName;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.primaryTrade !== undefined) dbUpdates.primary_trade = updates.primaryTrade;
      if (updates.trades !== undefined) dbUpdates.trades = updates.trades;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode;
      if (updates.radius !== undefined) dbUpdates.radius = updates.radius;
      if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.abn !== undefined) dbUpdates.abn = updates.abn;
      if (updates.additionalTrades !== undefined) dbUpdates.additional_trades = updates.additionalTrades;
      if (updates.subcontractorPlan !== undefined) dbUpdates.subcontractor_plan = updates.subcontractorPlan;
      if (updates.subcontractorAlertsEnabled !== undefined)
        dbUpdates.subcontractor_alerts_enabled = updates.subcontractorAlertsEnabled;
      if (updates.subcontractorAlertChannelInApp !== undefined)
        dbUpdates.subcontractor_alert_channel_in_app = updates.subcontractorAlertChannelInApp;
      if (updates.subcontractorAlertChannelEmail !== undefined)
        dbUpdates.subcontractor_alert_channel_email = updates.subcontractorAlertChannelEmail;
      if (updates.subcontractorAlertChannelSms !== undefined)
        dbUpdates.subcontractor_alert_channel_sms = updates.subcontractorAlertChannelSms;
      if (updates.subcontractorPreferredRadiusKm !== undefined)
        dbUpdates.subcontractor_preferred_radius_km = updates.subcontractorPreferredRadiusKm;
      if (updates.subcontractorAvailabilityHorizonDays !== undefined)
        dbUpdates.subcontractor_availability_horizon_days = updates.subcontractorAvailabilityHorizonDays;
      if (updates.subcontractorWorkAlertsEnabled !== undefined)
        dbUpdates.subcontractor_work_alerts_enabled = updates.subcontractorWorkAlertsEnabled;
      if (updates.subcontractorWorkAlertInApp !== undefined)
        dbUpdates.subcontractor_work_alert_in_app = updates.subcontractorWorkAlertInApp;
      if (updates.subcontractorWorkAlertEmail !== undefined)
        dbUpdates.subcontractor_work_alert_email = updates.subcontractorWorkAlertEmail;
      if (updates.subcontractorWorkAlertSms !== undefined)
      dbUpdates.subcontractor_work_alert_sms = updates.subcontractorWorkAlertSms;
      if (updates.subcontractorAvailabilityBroadcastEnabled !== undefined)
        dbUpdates.subcontractor_availability_broadcast_enabled = updates.subcontractorAvailabilityBroadcastEnabled;
      if (updates.smsOptInPromptShown !== undefined)
        dbUpdates.sms_opt_in_prompt_shown = updates.smsOptInPromptShown;

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase.from('users').upsert(dbUpdates, { onConflict: 'id' });

      if (error) {
        console.error('[Auth] Error updating user:', error);
        throw new Error('Failed to update profile');
      }

      const updatedUser = { ...currentUser, ...updates };
      const userIndex = store.users.findIndex((u) => u.id === currentUser.id);
      if (userIndex !== -1) store.users[userIndex] = updatedUser;

      setCurrentUser(updatedUser);
      store.setCurrentUser(updatedUser);
    },
    [currentUser, store, supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        session,
        isLoading,
        login,
        signup,
        logout,
        switchUser,
        quickLogin,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
