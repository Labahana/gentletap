"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLogo } from "@/components/auth-logo";
import { useAffiliateAuth } from "@/lib/affiliate-auth";

export default function AffiliateLoginPage() {
  const { login } = useAffiliateAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/affiliates/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <AuthLogo />
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold">Creator login</h1>
        <p className="mt-1 text-sm text-muted">Affiliate dashboard for approved partners</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Not a partner yet?{" "}
          <Link href="/affiliates#apply" className="font-medium text-accent">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  );
}
