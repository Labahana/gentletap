"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    api
      .adminMe()
      .then(() => setVerified(true))
      .catch(() => router.replace("/dashboard"))
      .finally(() => setChecking(false));
  }, [loading, user, router]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Verifying admin access…
      </div>
    );
  }

  if (!verified) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Logo height={28} />
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>{user?.email}</span>
            <Link href="/dashboard" className="text-slate-300 hover:text-white">
              Exit admin
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
