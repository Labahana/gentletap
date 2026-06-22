"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/email", label: "Email Settings" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/delete", label: "Delete Account", danger: true },
] as const;

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-xl font-bold sm:text-2xl">Account Settings</h1>

      <nav className="-mx-1 mt-4 flex gap-0.5 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition ${
                active
                  ? tab.danger
                    ? "border-red font-medium text-red"
                    : "border-foreground font-medium text-foreground"
                  : tab.danger
                    ? "border-transparent text-red/80 hover:text-red"
                    : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
