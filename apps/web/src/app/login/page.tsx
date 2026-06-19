"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthLogo } from "@/components/auth-logo";
import { AuthDivider, GoogleAuthButton } from "@/components/google-auth-button";
import { useAuth } from "@/lib/auth-context";
import { postAuthPath } from "@/lib/onboarding";

function friendlyLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid email or password")) {
    return "That email or password doesn't look right. Try again or reset your password.";
  }
  return message;
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetSuccess = searchParams.get("reset") === "1";
  const googleError = searchParams.get("google") === "error" ? searchParams.get("message") : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await login(email, password);
      router.push(postAuthPath(me));
    } catch (err) {
      setError(
        friendlyLoginError(err instanceof Error ? err.message : "Login failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {resetSuccess && (
        <p className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800">
          Password updated. Log in with your new password.
        </p>
      )}
      {googleError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(googleError)}
        </p>
      )}

      <div className={resetSuccess || googleError ? "mt-4" : "mt-6"}>
        <GoogleAuthButton intent="login" disabled={loading} />
      </div>
      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center justify-between">
            Password
            <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </span>
          <input
            type="password"
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {error.includes("reset your password") && (
              <>
                {" "}
                <Link href="/forgot-password" className="font-medium underline">
                  Reset password
                </Link>
              </>
            )}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <AuthLogo />
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold">Welcome back</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create account
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
