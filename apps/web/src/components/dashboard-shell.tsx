"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  IconLayoutDashboard,
  IconFileInvoice,
  IconUsers,
  IconMail,
  IconChartLine,
  IconPlug,
  IconSettings,
  IconHome,
  IconBell,
} from "@tabler/icons-react";
import { DashIcon, type IconProps } from "@/components/dashboard-icons";
import { LegalLinks } from "@/components/legal-links";
import { Logo } from "@/components/logo";
import { MobileUpgradeStrip, SidebarUpgradeNote } from "@/components/upgrade-prompt";
import { useAuth } from "@/lib/auth-context";
import { planLabel } from "@/lib/pricing";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  mobileLabel?: string;
  exact?: boolean;
};

const DESKTOP: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: IconLayoutDashboard, exact: true },
  { href: "/dashboard/invoices", label: "Invoices", icon: IconFileInvoice },
  { href: "/dashboard/clients", label: "Clients", icon: IconUsers },
  { href: "/dashboard/alerts", label: "Reminders sent", icon: IconMail },
  { href: "/dashboard/analytics", label: "Analytics", icon: IconChartLine },
  { href: "/settings/integrations", label: "Connections", icon: IconPlug },
  { href: "/settings/profile", label: "Settings", icon: IconSettings },
];

const MOBILE: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: IconHome, exact: true },
  { href: "/dashboard/invoices", label: "Invoices", icon: IconFileInvoice },
  { href: "/dashboard/alerts", label: "Alerts", icon: IconBell },
  { href: "/dashboard/analytics", label: "Analytics", icon: IconChartLine },
  { href: "/settings/profile", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/dashboard/invoices") {
    return pathname === item.href || pathname.startsWith("/dashboard/invoices/");
  }
  if (item.href === "/dashboard/clients") {
    return pathname === item.href || pathname.startsWith("/dashboard/clients/");
  }
  if (item.href === "/dashboard/alerts") {
    return pathname === item.href || pathname === "/dashboard/escalations";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  badge,
  variant,
}: {
  item: NavItem;
  badge?: number;
  variant: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item);
  const label = variant === "bottom" ? (item.mobileLabel ?? item.label) : item.label;
  const Icon = item.icon;

  if (variant === "bottom") {
    return (
      <Link
        href={item.href}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[9px] transition ${
          active ? "font-medium text-foreground" : "text-muted"
        }`}
      >
        <Icon size={20} stroke={1.75} className={active ? "text-accent" : ""} />
        {label}
        {badge != null && badge > 0 && (
          <span className="absolute right-[18%] top-0 h-1.5 w-1.5 rounded-full bg-red" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 px-4 py-1.5 text-[13px] transition ${
        active
          ? "border-r-2 border-foreground bg-background font-medium text-foreground"
          : "text-muted hover:bg-background/60 hover:text-foreground"
      }`}
    >
      <Icon size={16} stroke={1.75} />
      <span className="flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
      )}
    </Link>
  );
}

function SidebarFooter({
  monthlyUsed,
  monthlyLimit,
}: {
  monthlyUsed?: number;
  monthlyLimit?: number;
}) {
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

  const usage =
    monthlyLimit != null && monthlyUsed != null
      ? `${planLabel(user.plan)} · ${monthlyUsed} of ${monthlyLimit} used`
      : `${planLabel(user.plan)} plan`;

  return (
    <div ref={ref} className="relative border-t border-border px-4 py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user.full_name || user.email.split("@")[0]}</p>
          <p className="truncate text-[11px] text-muted">{usage}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-3 right-3 z-50 mb-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <Link href="/settings/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-background">
            Profile & settings
          </Link>
          <Link href="/settings/billing" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-background">
            Billing & plan
          </Link>
          <button
            type="button"
            onClick={() => { setOpen(false); logout(); }}
            className="block w-full border-t border-border px-4 py-2 text-left text-sm text-muted hover:bg-background"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({
  children,
  alertCount = 0,
  autopilotOn = true,
  monthlyUsed,
  monthlyLimit,
}: {
  children: React.ReactNode;
  alertCount?: number;
  autopilotOn?: boolean;
  monthlyUsed?: number;
  monthlyLimit?: number;
}) {
  const { user } = useAuth();
  const showMobileUpgrade = user?.plan === "free";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[196px] flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-4 pb-3.5 pt-4">
          <Logo height={24} href="/dashboard" compact />
          {autopilotOn && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-medium text-green">
              <DashIcon name="robot" size={10} /> Autopilot on
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto py-2">
          {DESKTOP.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              variant="sidebar"
              badge={item.href === "/dashboard/alerts" ? alertCount : undefined}
            />
          ))}
        </nav>

        <SidebarUpgradeNote monthlyLimit={monthlyLimit} />
        <div className="hidden px-3 pb-2 lg:block">
          <LegalLinks className="justify-center" />
        </div>
        <SidebarFooter monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit} />
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[196px]">
        <div className={showMobileUpgrade ? "pb-[118px] lg:pb-0" : "pb-[72px] lg:pb-0"}>{children}</div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <MobileUpgradeStrip monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit} />
        <nav className="flex border-t border-border bg-card px-0.5 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {MOBILE.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              variant="bottom"
              badge={item.href === "/dashboard/alerts" ? alertCount : undefined}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
