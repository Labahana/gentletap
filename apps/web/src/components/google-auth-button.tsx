"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Props = {
  intent: "signup" | "login";
  disabled?: boolean;
};

export function GoogleAuthButton({ intent, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { authorization_url } = await api.googleAuthUrl(intent);
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in is unavailable");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startGoogle}
        disabled={disabled || loading}
        className="btn-secondary flex w-full items-center justify-center gap-3"
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="text-center text-xs text-red">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l-.03.2 2.68 2.08.19.02c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.6-5.12-3.74l-.26.02-2.78 2.15-.09.25C3.06 15.98 5.8 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.41 5.41 0 0 1 3.54 9c0-.62.11-1.22.34-1.78L.96 5.05A8.97 8.97 0 0 0 0 9c0 1.45.35 2.82.96 4.05l2.92-2.27z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.68 0 2.81.73 3.46 1.34l2.53-2.48C13.46.99 11.43 0 9 0 5.8 0 3.06 2.02 1.24 5.05l2.88 2.17C4.6 5.18 6.62 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthDivider() {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card px-3 text-muted">or</span>
      </div>
    </div>
  );
}
