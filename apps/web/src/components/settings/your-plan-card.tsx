"use client";

import Link from "next/link";
import { planLabel } from "@/lib/pricing";

const FREE_MONTHLY_LIMIT = 5;

type Props = {
  plan: string;
  monthlyUsed?: number;
  monthlyLimit?: number;
};

export function YourPlanCard({ plan, monthlyUsed, monthlyLimit }: Props) {
  const isFree = plan === "free";
  const limit = monthlyLimit ?? FREE_MONTHLY_LIMIT;
  const used = monthlyUsed ?? 0;
  const remaining = Math.max(limit - used, 0);

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Your Plan</h2>
        <div className="flex items-center gap-2">
          {isFree && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wide text-foreground">
              FREE
            </span>
          )}
          <Link href="/settings/billing" className="btn-primary px-3 py-1.5 text-xs font-semibold">
            See Plans
          </Link>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-border text-sm">
        <div className="flex justify-between gap-4 py-2.5">
          <dt className="text-muted">License type</dt>
          <dd className="font-medium">{planLabel(plan)}</dd>
        </div>
        {isFree ? (
          <>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Collection limit</dt>
              <dd className="font-medium">{limit}/month (free plan)</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Collections remaining</dt>
              <dd className="font-medium">
                {remaining} of {limit}
              </dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">Status</dt>
            <dd className="font-medium text-green">Active</dd>
          </div>
        )}
      </dl>

      {isFree && (
        <Link href="/settings/billing" className="btn-secondary mt-4 inline-flex py-2 text-sm">
          Upgrade plan
        </Link>
      )}
    </div>
  );
}
