'use client';
// vim: ts=2
import * as jose from "jose";
import { useDeleteCookie } from "cookies-next";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { userDataService } from "@/libs/data/service";
import {
  hasSubcontractorPremium,
  hasBuilderPremium,
  hasContractorPremium,
  canChangePrimaryTrade,
} from '@/lib/capability-utils';
import { normalizeGoogleListingVerificationStatus } from '@/lib/google-business';
import { normalizeTrade, normalizeTradesList } from '@/lib/trades/normalizeTrade';
import { getDisplayTradeListFromUserRow, splitSelectedTrades } from '@/lib/trades/user-trades';
import {
  normalizeAbnForDb,
  userMetadataIndicatesAbrVerified,
  abrVerifiedAtFromUserMetadata,
} from '@/lib/abn-normalize';
import { hasValidABN } from '@/lib/abn-utils';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';
import { getAxios } from "@/lib/utils";

const numOrNull = (v: unknown): number | null => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const isValidDiscoveryCoord = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const hasValidCoordinatePair = (lat: unknown, lng: unknown): lat is number =>
  isValidDiscoveryCoord(lat) &&
  isValidDiscoveryCoord(lng) &&
  !(Number(lat) === 0 && Number(lng) === 0);

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

type Availability = Record<Day, boolean>;

type AuthCtx = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
	jwt: string|null;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeSubscriptionStatus(s?: string | null): string | null {
  const v = (s || '').trim().toUpperCase();
  if (!v) return null;
  if (['NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED'].includes(v)) return v;
  return v as string;
}

export function AuthContextProvider({ children }: { children: React.ReactNode }) {

  const [jwt, setJWT] = useState<string | null>(null);
	const deleteCookie = useDeleteCookie();

  const login: AuthCtx['login'] = useCallback(
    async (email, password) => {
			return new Promise(async(resolve, reject)=>{
				const creds = { email: email, password: password };
				const response_ = await getAxios(null).post("/api/auth/login", creds);
				const token = response_.data.token;
				setJWT(token);
				resolve(token);
			});
    },
    [jwt]
  );
  const logout: AuthCtx['logout'] = useCallback(
    async () => {
			return new Promise(async(resolve, reject)=>{
				deleteCookie("authorization");
    		setJWT(null);
				resolve();
			});
    },
    [jwt]
  );

  const value: AuthCtx = useMemo(
    () => ({
      login,
      logout,
			jwt
    }),
    [login, logout, jwt]
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
