"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, clearToken, getRefreshToken, getToken, setTokens, type User } from "./api";
import { getAffiliateRefCookie, tryAttributeFromCookie } from "./affiliate-ref";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.me(token));
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token } = await api.login({ email, password });
    setTokens(access_token, refresh_token);
    await tryAttributeFromCookie(access_token);
    const me = await api.me(access_token);
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const ref_code = getAffiliateRefCookie() ?? undefined;
    const { access_token, refresh_token } = await api.register({
      email,
      password,
      full_name: fullName,
      ref_code,
    });
    setTokens(access_token, refresh_token);
    const me = await api.me(access_token);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    if (refresh) {
      api.logout(refresh).catch(() => undefined);
    }
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
