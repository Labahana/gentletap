"use client";

import { useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";

/** True when the signed-in user is on ADMIN_EMAILS. False while checking or on error. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    api
      .adminMe(token)
      .then(() => {
        if (!cancelled) setIsAdmin(true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
