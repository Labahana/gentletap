"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, clearToken, type User } from "./api";
import { getAffiliateRefCookie, tryAttributeFromCookie } from "./affiliate-ref";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped on login/register/logout so a stale in-flight /auth/me cannot
  // overwrite a fresh session (or clear a just-logged-in user).
  const sessionGen = useRef(0);

  const refresh = useCallback(async () => {
    const gen = sessionGen.current;
    try {
      const me = await api.me();
      if (gen !== sessionGen.current) return;
      setUser(me);
    } catch {
      if (gen !== sessionGen.current) return;
      clearToken();
      setUser(null);
    } finally {
      if (gen === sessionGen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearToken();
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: me } = await api.login({ email, password });
    sessionGen.current += 1;
    await tryAttributeFromCookie();
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const ref_code = getAffiliateRefCookie() ?? undefined;
    const { user: me } = await api.register({
      email,
      password,
      full_name: fullName,
      ref_code,
    });
    sessionGen.current += 1;
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const logout = useCallback(async () => {
    sessionGen.current += 1;
    await api.logout();
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
