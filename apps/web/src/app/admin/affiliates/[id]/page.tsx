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

const PAYOUT_METHODS = [
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise" },
  { value: "bank_transfer", label: "Bank transfer" },
] as const;

export default function AdminAffiliateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<string>("paypal");
  const [allowBelowMinimum, setAllowBelowMinimum] = useState(false);
  const [founderRate, setFounderRate] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api.adminAffiliateDetail(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function recordPayout() {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    try {
      await api.adminAffiliatePayout(id, {
        amount,
        reference: payoutRef || undefined,
        method: payoutMethod,
        allow_below_minimum: allowBelowMinimum || undefined,
      });
      setMsg(`Recorded payout of $${amount.toFixed(2)} via ${payoutMethod}`);
      setPayoutAmount("");
      setPayoutRef("");
      setAllowBelowMinimum(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payout failed");
    }
  }

  async function approve() {
    try {
      const result = await api.adminApproveAffiliate(
        id,
        undefined,
        founderRate ? 0.4 : undefined,
      );
      setMsg(
        `Approved — ref code: ${result.ref_code}, rate ${Math.round(result.commission_rate * 100)}%`,
      );
      setFounderRate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    }
  }

  if (!detail && !error) return <AdminLoading />;
  if (!detail) return <AdminAlert tone="error">{error}</AdminAlert>;

  const affiliate = detail.affiliate as Record<string, unknown>;
  const stats = detail.stats as Record<string, number>;
  const commission = detail.commission as Record<string, number | null> | undefined;
  const referrals = (detail.referrals as Array<Record<string, unknown>>) || [];
  const applicationNote =
    typeof affiliate.application_note === "string" ? affiliate.application_note : "";
  const payoutDetails =
    typeof affiliate.payout_details === "string" ? affiliate.payout_details : "";
  const payoutMinimum = commission?.payout_minimum ?? 20;

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
            <dt className="text-slate-500">Partner type</dt>
            <dd className="capitalize">{String(affiliate.partner_type || "creator")}</dd>
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
            <dt className="text-slate-500">Manual rate</dt>
            <dd>
              {Math.round(Number(affiliate.commission_rate ?? 0.3) * 100)}%
              {Number(affiliate.commission_rate) > 0.3 && (
                <span className="ml-1 text-xs text-amber-400">founder tier</span>
              )}
            </dd>
          </div>
          {commission && (
            <div>
              <dt className="text-slate-500">This month</dt>
              <dd>
                ${Number(commission.month_referred_revenue ?? 0).toFixed(2)} referred · effective{" "}
                {Math.round(Number(commission.effective_rate ?? 0.3) * 100)}%
              </dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Payout method</dt>
            <dd className="capitalize">{String(affiliate.payout_method || "paypal").replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Payout email</dt>
            <dd>{String(affiliate.payout_email || "—")}</dd>
          </div>
        </dl>
        {payoutDetails ? (
          <p className="mt-4 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            <span className="text-slate-500">Bank details: </span>
            {payoutDetails}
          </p>
        ) : null}
        {applicationNote ? (
          <p className="mt-4 text-sm text-slate-400">{applicationNote}</p>
        ) : null}
      </AdminSection>

      {affiliate.status === "pending" && (
        <AdminSection title="Approve application" className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton variant="primary" onClick={() => void approve()}>
              Approve
            </AdminButton>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={founderRate}
                onChange={(e) => setFounderRate(e.target.checked)}
              />
              Founder tier — 40% for first 6 months (first 25 affiliates)
            </label>
          </div>
        </AdminSection>
      )}

      <AdminSection title="Record payout" className="mt-6">
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
            Method
            <select
              className="mt-1 block rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
            >
              {PAYOUT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Reference
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
        <p className="mt-3 text-xs text-slate-500">
          Program minimum: ${payoutMinimum}. Net-15 schedule.
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={allowBelowMinimum}
            onChange={(e) => setAllowBelowMinimum(e.target.checked)}
          />
          Allow below-minimum payout (exception)
        </label>
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
