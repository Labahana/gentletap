"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import {
  fetchAffiliateDashboard,
  useAffiliateAuth,
  type AffiliateDashboard,
} from "@/lib/affiliate-auth";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_PAYOUT_MINIMUM,
  AFFILIATE_PAYOUT_SCHEDULE,
} from "@/lib/affiliate-program";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function eventTypeLabel(eventType: string): string {
  if (eventType === "initial") return "First month (bounty)";
  if (eventType === "renewal") return "Renewal";
  if (eventType === "refund") return "Refund";
  return eventType;
}

function payoutMethodLabel(method: string): string {
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "wise") return "Wise";
  return "PayPal";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary shrink-0 px-3 py-2 text-xs"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AffiliateDashboardPage() {
  const { affiliate, loading, logout, getToken } = useAffiliateAuth();
  const router = useRouter();
  const [dash, setDash] = useState<AffiliateDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setDash(await fetchAffiliateDashboard(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [getToken]);

  useEffect(() => {
    if (loading) return;
    if (!affiliate) {
      router.replace("/affiliates/login");
      return;
    }
    void Promise.resolve().then(() => load());
  }, [loading, affiliate, router, load]);

  if (loading || !affiliate) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading dashboard…
      </div>
    );
  }

  const primaryLink = dash?.links.signup || dash?.links.home || "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo height={28} href="/" />
            <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold uppercase text-accent">
              Affiliate
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{affiliate.email}</span>
            <button type="button" className="text-muted hover:text-foreground" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {affiliate.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {dash?.commission
                ? `${Math.round(dash.commission.first_month_rate * 100)}% first month · ${Math.round(dash.commission.effective_rate * 100)}% renewals`
                : `${(affiliate.commission_rate * 100).toFixed(0)}% commission`}{" "}
              · {dash?.stats.commission_months ?? AFFILIATE_COMMISSION_MONTHS} months per referral ·
              ref <code className="rounded bg-card px-1.5 py-0.5">{affiliate.ref_code}</code>
            </p>
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>}

        {primaryLink && (
          <div className="card mt-8">
            <p className="text-sm font-medium">Your referral link</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded-xl border border-border bg-background px-3 py-2 text-sm">
                {primaryLink}
              </code>
              <CopyButton text={primaryLink} />
            </div>
            {dash?.links.pricing && (
              <p className="mt-3 text-xs text-muted">
                Pricing link:{" "}
                <a href={dash.links.pricing} className="text-accent hover:underline">
                  {dash.links.pricing}
                </a>
              </p>
            )}
            {dash?.promotion?.audience_offer && (
              <div className="mt-4 rounded-xl border border-accent/25 bg-accent/5 p-4">
                <p className="text-sm font-medium">Tell your audience</p>
                <p className="mt-1 text-sm text-muted">
                  Customers who use your link get{" "}
                  <strong className="text-foreground">{dash.promotion.audience_offer}</strong> on
                  paid plans at checkout.
                </p>
                {dash.promotion.sample_description && (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Sample YouTube description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-xs text-muted">
                      {dash.promotion.sample_description}
                    </p>
                    <div className="mt-2">
                      <CopyButton text={dash.promotion.sample_description} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {dash && (
          <>
            {dash.commission && (
              <div className="card mt-8 border-accent/30">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      Your commission tier:{" "}
                      <span className="text-accent">
                        {Math.round(dash.commission.effective_rate * 100)}% on renewals
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      ${dash.commission.month_referred_revenue.toFixed(2)} referred this month
                      {dash.commission.next_tier_threshold
                        ? ` — $${(dash.commission.next_tier_threshold - dash.commission.month_referred_revenue).toFixed(2)} more unlocks ${
                            dash.commission.next_tier_threshold === dash.commission.tier2_threshold
                              ? Math.round(dash.commission.tier2_rate * 100)
                              : Math.round(dash.commission.tier3_rate * 100)
                          }%`
                        : " — top tier reached"}
                      . First-month payments always earn {Math.round(dash.commission.first_month_rate * 100)}%.
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (dash.commission.month_referred_revenue /
                              (dash.commission.next_tier_threshold ?? dash.commission.tier3_threshold)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-muted">
                      {dash.commission.next_tier_threshold
                        ? `$${dash.commission.next_tier_threshold.toLocaleString()} to next tier`
                        : "40% tier"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Clicks (30d)" value={dash.stats.clicks_30d} sub={`${dash.stats.clicks_total} all time`} />
              <StatCard label="Signups" value={dash.stats.signups} sub={`${dash.stats.conversion_rate}% from clicks`} />
              <StatCard
                label="Active subscribers"
                value={dash.stats.active_subscribers}
              />
              <StatCard
                label="Pending earnings"
                value={`$${dash.stats.pending_earnings.toFixed(2)}`}
                sub={`$${dash.stats.paid_earnings.toFixed(2)} paid · $${dash.stats.lifetime_earnings.toFixed(2)} lifetime`}
              />
            </div>

            <section className="mt-10">
              <h2 className="text-lg font-semibold">Referrals</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-card/60 text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Signed up</th>
                      <th className="px-4 py-3">Commission until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.referrals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted">
                          No referrals yet — share your link in your next video.
                        </td>
                      </tr>
                    ) : (
                      dash.referrals.map((r) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="px-4 py-3">{r.user_email_masked}</td>
                          <td className="px-4 py-3 capitalize">{r.user_plan}</td>
                          <td className="px-4 py-3 capitalize">{r.status.replace("_", " ")}</td>
                          <td className="px-4 py-3">{new Date(r.signed_up_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {r.commission_ends_at
                              ? new Date(r.commission_ends_at).toLocaleDateString()
                              : r.first_paid_at
                                ? "—"
                                : "Starts at first payment"}
                            {!r.commission_eligible && r.commission_ends_at && (
                              <span className="ml-1 text-xs text-muted">(ended)</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold">Commissions</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-card/60 text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Commission</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.commissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted">
                          Commissions appear when referred users subscribe.
                        </td>
                      </tr>
                    ) : (
                      dash.commissions.map((c) => (
                        <tr key={c.id} className="border-b border-border/60">
                          <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{eventTypeLabel(c.event_type)}</td>
                          <td className="px-4 py-3">
                            {c.currency} {c.gross_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {c.currency} {c.commission_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 capitalize">{c.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold">Payouts</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border bg-card/60 text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.payouts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted">
                          Payouts are processed monthly ({AFFILIATE_PAYOUT_SCHEDULE}) via your chosen
                          method once you reach the ${AFFILIATE_PAYOUT_MINIMUM} minimum.
                        </td>
                      </tr>
                    ) : (
                      dash.payouts.map((p) => (
                        <tr key={p.id} className="border-b border-border/60">
                          <td className="px-4 py-3">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {p.currency} {p.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">{payoutMethodLabel(p.method)}</td>
                          <td className="px-4 py-3">{p.reference || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted">
          Questions?{" "}
          <Link href="/contact" className="text-accent hover:underline">
            Contact us
          </Link>
          {" · "}
          <Link href="/affiliates/resources" className="text-accent hover:underline">
            Resource kit
          </Link>
          {" · "}
          <Link href="/affiliates/terms" className="text-accent hover:underline">
            Affiliate terms
          </Link>
        </p>
      </main>
    </div>
  );
}
