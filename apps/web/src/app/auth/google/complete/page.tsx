"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthLogo } from "@/components/auth-logo";
import { tryAttributeFromCookie } from "@/lib/affiliate-ref";
import { postAuthPath } from "@/lib/onboarding";

function GoogleComplete() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Google sign-in did not complete. Please try again.");
      return;
    }
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/session/google", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Google sign-in failed" }));
          throw new Error(typeof err.detail === "string" ? err.detail : "Google sign-in failed");
        }
        const { user: me } = (await res.json()) as { user: { onboarding_step: string; onboarding_completed_at: string | null } };
        if (!active) return;
        await tryAttributeFromCookie();
        window.location.href = postAuthPath(me);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="card w-full max-w-md text-center">
        <p className="text-sm text-red">{error}</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md text-center">
      <p className="text-sm text-muted animate-pulse">Finishing Google sign-in…</p>
    </div>
  );
}

export default function GoogleAuthCompletePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <AuthLogo />
      <Suspense
        fallback={
          <div className="card w-full max-w-md text-center text-sm text-muted">Loading…</div>
        }
      >
        <GoogleComplete />
      </Suspense>
    </div>
  );
}
