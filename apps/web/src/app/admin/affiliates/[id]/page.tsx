"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminButton,
  AdminLoading,
  AdminPageHeader,
  AdminSection,
  AdminStatCard,
} from "@/components/admin/ui";
import { api } from "@/lib/api";

export default function AdminAffiliateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await api.adminAffiliateDetail(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordPayout() {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    try {
      await api.adminAffiliatePayout(id, {
        amount,
        reference: payoutRef || undefined,
        method: "paypal",
      });
      setMsg(`Recorded payout of $${amount.toFixed(2)}`);
      setPayoutAmount("");
      setPayoutRef("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payout failed");
    }
  }

  if (!detail && !error) return <AdminLoading />;
  if (!detail) return <AdminAlert tone="error">{error}</AdminAlert>;

  const affiliate = detail.affiliate as Record<string, unknown>;
  const stats = detail.stats as Record<string, number>;
  const referrals = (detail.referrals as Array<Record<string, unknown>>) || [];
  const applicationNote =
    typeof affiliate.application_note === "string" ? affiliate.application_note : "";

  return (
    <>
      <AdminPageHeader
        title={String(affiliate.name)}
        description={String(affiliate.email)}
        actions={
          <Link href="/admin/affiliates" className="text-sm text-slate-400 hover:text-white">
            ← All affiliates
          </Link>
        }
      />

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {msg && <AdminAlert tone="success">{msg}</AdminAlert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Clicks" value={stats.clicks_total} />
        <AdminStatCard label="Signups" value={stats.signups} />
        <AdminStatCard label="Active subs" value={stats.active_subscribers} />
        <AdminStatCard label="Pending $" value={`$${stats.pending_earnings.toFixed(2)}`} />
      </div>

      <AdminSection title="Partner details" className="mt-6">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="capitalize">{String(affiliate.status)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ref code</dt>
            <dd>{String(affiliate.ref_code || "—")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Channel</dt>
            <dd>{String(affiliate.channel_name || "—")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Payout email</dt>
            <dd>{String(affiliate.payout_email || "—")}</dd>
          </div>
        </dl>
        {applicationNote ? (
          <p className="mt-4 text-sm text-slate-400">{applicationNote}</p>
        ) : null}
      </AdminSection>

      <AdminSection title="Record PayPal payout" className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Amount (USD)
            <input
              type="number"
              step="0.01"
              className="mt-1 block rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
            />
          </label>
          <label className="text-sm">
            PayPal reference
            <input
              className="mt-1 block rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
            />
          </label>
          <AdminButton variant="primary" onClick={() => void recordPayout()}>
            Record payout
          </AdminButton>
        </div>
      </AdminSection>

      <AdminSection title="Referrals" className="mt-6">
        <ul className="space-y-2 text-sm">
          {referrals.length === 0 ? (
            <li className="text-slate-500">No referrals yet</li>
          ) : (
            referrals.map((r) => (
              <li key={String(r.id)} className="flex justify-between border-b border-slate-800 py-2">
                <span>{String(r.user_email_masked)}</span>
                <span className="text-slate-500 capitalize">
                  {String(r.user_plan)} · {String(r.status)}
                </span>
              </li>
            ))
          )}
        </ul>
      </AdminSection>
    </>
  );
}
