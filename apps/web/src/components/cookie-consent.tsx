"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "gentletap_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem(CONSENT_KEY, level);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted">
          We use essential cookies and local storage to keep you signed in and run GentleTap. See our{" "}
          <Link href="/cookies" className="text-accent hover:underline">
            Cookie Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary py-2 text-sm" onClick={() => accept("essential")}>
            Essential only
          </button>
          <button type="button" className="btn-primary py-2 text-sm" onClick={() => accept("all")}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
