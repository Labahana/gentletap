"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLogo } from "@/components/auth-logo";
import { api, setTokens } from "@/lib/api";
import { tryAttributeFromCookie } from "@/lib/affiliate-ref";
import { postAuthPath } from "@/lib/onboarding";

function GoogleComplete() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Google sign-in did not complete. Please try again.");
      return;
    }

    let active = true;
    (async () => {
      try {
        const { access_token, refresh_token } = await api.googleAuthExchange(code);
        if (!active) return;
        setTokens(access_token, refresh_token);
        await tryAttributeFromCookie(access_token);
        const me = await api.me(access_token);
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
