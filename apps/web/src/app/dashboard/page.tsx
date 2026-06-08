"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Gentle<span className="text-accent">Tap</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{user.email}</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">
              {user.plan}
            </span>
            <button onClick={logout} className="text-muted hover:text-foreground">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted">
          Green · yellow · red — your invoices at a glance
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "On track", count: 0, color: "bg-green/15 text-green" },
            { label: "Being followed up", count: 0, color: "bg-yellow/20 text-yellow" },
            { label: "Needs you", count: 0, color: "bg-red/15 text-red" },
          ].map((s) => (
            <div key={s.label} className="card">
              <p className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                {s.label}
              </p>
              <p className="mt-3 text-3xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8 text-center text-muted">
          <p className="font-medium text-foreground">No invoices yet</p>
          <p className="mt-2 text-sm">
            Connect QuickBooks in onboarding to import unpaid invoices. Week 2 ships live sync.
          </p>
          <Link href="/onboarding" className="btn-primary mt-6 inline-flex">
            Complete setup
          </Link>
        </div>
      </main>
    </div>
  );
}
