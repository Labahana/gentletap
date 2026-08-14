"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleAuthButton, AuthDivider } from "@/components/google-auth-button";
import { PasswordRequirements } from "@/components/password-requirements";
import { ReferralDiscountBanner } from "@/components/referral-discount-banner";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <h1 className="text-xl font-bold">Create your free account</h1>
      <p className="mt-1 text-sm text-muted">Start free — no credit card required</p>
      <ReferralDiscountBanner />

      <div className="mt-6">
        <GoogleAuthButton intent="signup" disabled={loading} />
      </div>
      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Full name
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
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
          Password
          <input
            type="password"
            minLength={8}
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordRequirements password={password} />
        </label>
        <label className="block text-sm">
          Confirm password
          <input
            type="password"
            minLength={8}
            className="input mt-1"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        {error && <p className="text-sm text-red">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create free account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        By signing up you agree to our{" "}
        <Link href="/terms" className="text-accent hover:underline">
          Terms
        </Link>{" "}
        &{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy
        </Link>
        . Free plan — no credit card required.
      </p>
    </AuthShell>
  );
}
