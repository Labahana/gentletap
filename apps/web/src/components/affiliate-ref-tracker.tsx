"use client";

import { useEffect } from "react";
import {
  getAffiliateRefFromUrl,
  getAffiliateRefCookie,
  setAffiliateRefCookie,
  trackAffiliateClick,
} from "@/lib/affiliate-ref";

/** Captures ?ref= from URL into a 30-day cookie and records a click. */
export function AffiliateRefTracker() {
  useEffect(() => {
    const fromUrl = getAffiliateRefFromUrl();
    const ref = fromUrl || getAffiliateRefCookie();
    if (!ref) return;
    if (fromUrl) setAffiliateRefCookie(fromUrl);
    void trackAffiliateClick(ref);
  }, []);

  return null;
}
