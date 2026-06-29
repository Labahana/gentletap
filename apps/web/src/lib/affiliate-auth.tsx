"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TokenResponse } from "@/lib/api";

const AFFILIATE_TOKEN_KEY = "gt_affiliate_token";
const AFFILIATE_REFRESH_KEY = "gt_affiliate_refresh";

export type AffiliateProfile = {
  id: string;
  name: string;
  email: string;
  status: string;
  ref_code: string | null;
  commission_rate: number;
  payout_email: string | null;
  channel_name: string | null;
  channel_url: string | null;
  approved_at: string | null;
};

export type AffiliateDashboard = {
  affiliate: AffiliateProfile;
  links: { home: string | null; signup: string | null; pricing: string | null };
  promotion?: {
    audience_discount_percent: number;
    audience_discount_months: number;
    audience_offer: string | null;
    sample_description: string | null;
  };
  stats: {
    clicks_total: number;
    clicks_30d: number;
    signups: number;
    active_subscribers: number;
    conversion_rate: number;
    commission_months: number;
    pending_earnings: number;
    approved_earnings: number;
    paid_earnings: number;
    lifetime_earnings: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    signed_up_at: string;
    first_paid_at: string | null;
    commission_ends_at: string | null;
    commission_eligible: boolean;
    churned_at: string | null;
    user_email_masked: string;
    user_plan: string;
  }>;
  commissions: Array<{
    id: string;
    event_type: string;
    gross_amount: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    reference: string | null;
    paid_at: string | null;
    created_at: string;
  }>;
};

type AffiliateAuthValue = {
  affiliate: AffiliateProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  getToken: () => string | null;
};

const AffiliateAuthContext = createContext<AffiliateAuthValue | null>(null);

async function affiliateRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/v1${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Request failed");
  }
  return res.json() as Promise<T>;
}

export function getAffiliateToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AFFILIATE_TOKEN_KEY);
}

function setAffiliateTokens(access: string, refresh?: string | null) {
  localStorage.setItem(AFFILIATE_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(AFFILIATE_REFRESH_KEY, refresh);
}

function clearAffiliateTokens() {
  localStorage.removeItem(AFFILIATE_TOKEN_KEY);
  localStorage.removeItem(AFFILIATE_REFRESH_KEY);
}

export function AffiliateAuthProvider({ children }: { children: React.ReactNode }) {
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getAffiliateToken();
    if (!token) {
      setAffiliate(null);
      setLoading(false);
      return;
    }
    try {
      setAffiliate(await affiliateRequest<AffiliateProfile>("/affiliates/me", {}, token));
    } catch {
      clearAffiliateTokens();
      setAffiliate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token } = await affiliateRequest<TokenResponse>(
      "/affiliates/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    setAffiliateTokens(access_token, refresh_token);
    setAffiliate(await affiliateRequest<AffiliateProfile>("/affiliates/me", {}, access_token));
  }, []);

  const logout = useCallback(() => {
    clearAffiliateTokens();
    setAffiliate(null);
  }, []);

  const value = useMemo(
    () => ({
      affiliate,
      loading,
      login,
      logout,
      refresh,
      getToken: getAffiliateToken,
    }),
    [affiliate, loading, login, logout, refresh],
  );

  return <AffiliateAuthContext.Provider value={value}>{children}</AffiliateAuthContext.Provider>;
}

export function useAffiliateAuth() {
  const ctx = useContext(AffiliateAuthContext);
  if (!ctx) throw new Error("useAffiliateAuth must be used within AffiliateAuthProvider");
  return ctx;
}

export async function fetchAffiliateDashboard(token: string): Promise<AffiliateDashboard> {
  return affiliateRequest<AffiliateDashboard>("/affiliates/dashboard", {}, token);
}

export async function applyAffiliate(body: {
  email: string;
  password: string;
  name: string;
  channel_name?: string;
  channel_url?: string;
  payout_email?: string;
  application_note?: string;
}): Promise<{ status: string; message: string }> {
  return affiliateRequest("/affiliates/apply", { method: "POST", body: JSON.stringify(body) });
}

export async function fetchAffiliateProgram(): Promise<{
  commission_rate: number;
  cookie_days: number;
  payout_method: string;
}> {
  return affiliateRequest("/affiliates/program");
}
