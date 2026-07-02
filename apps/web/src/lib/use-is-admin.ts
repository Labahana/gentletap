"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/** True when the signed-in user is on ADMIN_EMAILS. False while checking or on error. */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    api
      .adminMe()
      .then(() => {
        if (!cancelled) setIsAdmin(true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}
