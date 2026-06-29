"use client";

import { useEffect, useState } from "react";
import { getAffiliateRefCookie } from "@/lib/affiliate-ref";
import { referralDiscountLabel } from "@/lib/affiliate-program";

/** Shown when visitor arrived via ?ref= — highlights the audience discount at checkout. */
export function ReferralDiscountBanner() {
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    setRefCode(getAffiliateRefCookie());
  }, []);

  if (!refCode) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
      role="status"
    >
      <p className="font-medium text-foreground">
        Referral offer: {referralDiscountLabel()} on paid plans
      </p>
      <p className="mt-1 text-muted">
        Applied automatically at checkout when you upgrade (code{" "}
        <code className="rounded bg-background px-1 py-0.5 text-xs">{refCode}</code>).
      </p>
    </div>
  );
}
