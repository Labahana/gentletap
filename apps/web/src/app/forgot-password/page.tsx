"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLogo } from "@/components/auth-logo";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <AuthLogo />
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we&apos;ll send a link to choose a new password.
        </p>

        {sent ? (
          <p className="mt-6 text-sm leading-relaxed text-muted">
            If an account exists for <strong className="text-foreground">{email}</strong>, we sent a
            reset link. Check your inbox (and spam folder).
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            {error && <p className="text-sm text-red">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-accent">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
