"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { planLabel } from "@/lib/pricing";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: number;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▤", exact: true },
  { href: "/dashboard/invoices", label: "Invoices", icon: "◻" },
  { href: "/dashboard/escalations", label: "Needs you", icon: "⚑" },
  { href: "/settings/connections", label: "Connections", icon: "⇌" },
  { href: "/settings/billing", label: "Billing", icon: "◇" },
];

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
        active
          ? "bg-accent/10 font-semibold text-accent border-l-2 border-accent pl-[10px]"
          : "text-muted hover:bg-border/50 hover:text-foreground"
      }`}
    >
      <span className={`text-base leading-none ${active ? "text-accent" : "text-muted group-hover:text-foreground"}`}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red px-1.5 py-0.5 text-xs font-semibold text-white">{badge}</span>
      )}
    </Link>
  );
}

function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-border/50 transition-all"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.full_name || user.email.split("@")[0]}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <span className="text-xs text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Account</p>
            <p className="mt-0.5 text-sm font-medium">{planLabel(user.plan)} plan</p>
          </div>
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-background transition-colors"
          >
            <span className="text-muted">◎</span> Profile & settings
          </Link>
          <Link
            href="/settings/billing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-background transition-colors"
          >
            <span className="text-muted">◇</span> Billing & plan
          </Link>
          <div className="border-t border-border">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-background hover:text-foreground transition-colors"
            >
              <span>→</span> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({
  children,
  escalationCount = 0,
}: {
  children: React.ReactNode;
  escalationCount?: number;
}) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Link href="/dashboard" className="text-xl font-bold">
            Gentle<span className="text-accent">Tap</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted/70">
            Workspace
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              badge={item.href === "/dashboard/escalations" ? escalationCount : undefined}
            />
          ))}
        </nav>

        {/* Free plan upgrade strip */}
        {user?.plan === "free" && (
          <div className="border-t border-border px-3 py-3">
            <Link
              href="/settings/billing"
              className="block rounded-xl bg-accent/8 border border-accent/20 px-3 py-2.5 text-xs hover:bg-accent/15 transition-colors"
            >
              <p className="font-semibold text-accent">Starter plan</p>
              <p className="mt-0.5 text-muted">Upgrade for unlimited collections →</p>
            </Link>
          </div>
        )}

        {/* Profile */}
        <div className="border-t border-border px-3 py-3">
          <ProfileDropdown />
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
