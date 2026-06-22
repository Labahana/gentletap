"use client";

import Link from "next/link";
import { IconBolt } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth-context";

export const FREE_COLLECTION_LIMIT = 5;

function usageLine(monthlyUsed?: number, monthlyLimit?: number): string {
  const limit = monthlyLimit ?? FREE_COLLECTION_LIMIT;
  if (monthlyUsed != null) {
    return `${monthlyUsed} of ${limit} collections used`;
  }
  return `Starter · ${limit} collections/mo`;
}

type UpgradePromptProps = {
  monthlyUsed?: number;
  monthlyLimit?: number;
};

export function SidebarUpgradeNote({ monthlyLimit }: Pick<UpgradePromptProps, "monthlyLimit">) {
  const { user } = useAuth();
  if (!user || user.plan !== "free") return null;

  const limit = monthlyLimit ?? FREE_COLLECTION_LIMIT;

  return (
    <div className="mx-3 mb-2 rounded-xl border border-accent/20 bg-accent/5 p-3">
      <div className="flex gap-2">
        <IconBolt size={16} stroke={1.75} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-foreground">Starter plan</span>
          {" · "}
          {limit} collection{limit === 1 ? "" : "s"}/mo. Upgrade to unlock unlimited invoices, WhatsApp
          nudges, and more.
        </p>
      </div>
      <Link
        href="/settings/billing"
        className="btn-primary mt-3 block w-full py-2 text-center text-xs font-semibold"
      >
        Upgrade now
      </Link>
    </div>
  );
}

export function MobileUpgradeStrip({ monthlyUsed, monthlyLimit }: UpgradePromptProps) {
  const { user } = useAuth();
  if (!user || user.plan !== "free") return null;

  return (
    <Link
      href="/settings/billing"
      className="flex items-center gap-2 border-t border-accent/20 bg-accent/5 px-3 py-2.5 active:bg-accent/10"
    >
      <IconBolt size={15} stroke={1.75} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
        <span className="font-medium text-foreground">{usageLine(monthlyUsed, monthlyLimit)}</span>
        {" · "}
        Unlock unlimited
      </span>
      <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-[10px] font-semibold text-white">
        Upgrade
      </span>
    </Link>
  );
}

export function DashboardUpgradeCard({ monthlyUsed, monthlyLimit }: UpgradePromptProps) {
  const { user } = useAuth();
  if (!user || user.plan !== "free") return null;

  const limit = monthlyLimit ?? FREE_COLLECTION_LIMIT;
  const usedLine =
    monthlyUsed != null ? `${monthlyUsed} of ${limit} collections used this month` : `${limit} collections/mo on Starter`;

  return (
    <div className="mb-4 rounded-xl border border-accent/20 bg-accent/5 p-3.5 lg:hidden">
      <div className="flex gap-2.5">
        <IconBolt size={18} stroke={1.75} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">{usedLine}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Upgrade to unlock unlimited invoices, WhatsApp nudges, and priority AI.
          </p>
          <Link
            href="/settings/billing"
            className="btn-primary mt-3 inline-block px-4 py-2 text-xs font-semibold"
          >
            Upgrade now
          </Link>
        </div>
      </div>
    </div>
  );
}
