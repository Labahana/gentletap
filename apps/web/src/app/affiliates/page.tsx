"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PasswordRequirements } from "@/components/password-requirements";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { applyAffiliate } from "@/lib/affiliate-auth";
import { AFFILIATE_COMMISSION_MONTHS, maxCommissionPerPlan } from "@/lib/affiliate-program";

const EARNINGS = [
  { plan: "Pro", price: 19, earn: 5.7 },
  { plan: "Pro+", price: 39, earn: 11.7 },
  { plan: "Team", price: 59, earn: 17.7 },
] as const;

export default function AffiliatesPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    channel_name: "",
    channel_url: "",
    payout_email: "",
    application_note: "",
  });
  const [agreedTerms, setAgreedTerms] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreedTerms) {
      setError("Please agree to the Affiliate Program Terms.");
      return;
    }
    setLoading(true);
    try {
      await applyAffiliate({
        email: form.email,
        password: form.password,
        name: form.name,
        channel_name: form.channel_name || undefined,
        channel_url: form.channel_url || undefined,
        payout_email: form.payout_email || undefined,
        application_note: form.application_note || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Affiliate program</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Earn 30% for {AFFILIATE_COMMISSION_MONTHS} months per referral
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Perfect for YouTube creators and educators with a freelancer audience. Refer GentleTap —
            automated invoice follow-ups via QuickBooks + Gmail — and earn 30% on each subscription
            payment for {AFFILIATE_COMMISSION_MONTHS} months from their first purchase.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="btn-primary">
              Apply now
            </a>
            <Link href="/affiliates/login" className="btn-secondary">
              Creator login
            </Link>
            <Link href="/affiliates/terms" className="btn-secondary">
              Program terms
            </Link>
          </div>
        </section>

        <section className="border-y border-border bg-card/40 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">What you earn per customer</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {EARNINGS.map((row) => (
                <div key={row.plan} className="card text-center">
                  <p className="text-sm font-medium text-muted">{row.plan}</p>
                  <p className="mt-2 text-3xl font-bold">${row.earn.toFixed(2)}</p>
                  <p className="mt-1 text-sm text-muted">per month · ${row.price}/mo plan</p>
                  <p className="mt-2 text-xs text-muted">
                    Up to ${maxCommissionPerPlan(row.price).toFixed(0)} over {AFFILIATE_COMMISSION_MONTHS}{" "}
                    months
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">
              50 Pro referrals in month 1 ≈ <strong className="text-foreground">$285/month</strong>{" "}
              in commissions. Each customer pays you for up to {AFFILIATE_COMMISSION_MONTHS} months — see{" "}
              <Link href="/affiliates/terms" className="text-accent hover:underline">
                program terms
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-8 space-y-4 text-muted">
            <li>
              <strong className="text-foreground">1. Apply</strong> — tell us about your channel. We
              approve creators whose audience matches freelancers using QuickBooks.
            </li>
            <li>
              <strong className="text-foreground">2. Get your link</strong> — share{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-sm">gentletap.co/?ref=yourcode</code>{" "}
              in videos, descriptions, and newsletters.
            </li>
            <li>
              <strong className="text-foreground">3. Track everything</strong> — clicks, signups,
              active subscribers, and earnings in your creator dashboard.
            </li>
            <li>
              <strong className="text-foreground">4. Earn for {AFFILIATE_COMMISSION_MONTHS} months</strong> —{" "}
              30% on each subscription payment for {AFFILIATE_COMMISSION_MONTHS} months per referred
              customer.
            </li>
            <li>
              <strong className="text-foreground">5. Get paid</strong> — monthly PayPal payouts on
              pending commissions (net 30).
            </li>
          </ol>
        </section>

        <section id="apply" className="border-t border-border bg-card/30 py-14">
          <div className="mx-auto max-w-lg px-6">
            <h2 className="text-2xl font-bold">Apply to the program</h2>
            {submitted ? (
              <div className="card mt-8">
                <p className="font-semibold text-green">Application received</p>
                <p className="mt-2 text-sm text-muted">
                  We&apos;ll review your channel and email you when approved. You can then log in to
                  get your referral link.
                </p>
                <Link href="/affiliates/login" className="btn-secondary mt-6 inline-flex">
                  Go to creator login
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="card mt-8 space-y-4">
                <label className="block text-sm">
                  Your name
                  <input
                    className="input mt-1"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>
                <label className="block text-sm">
                  Email (login + contact)
                  <input
                    type="email"
                    className="input mt-1"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </label>
                <label className="block text-sm">
                  Password
                  <input
                    type="password"
                    className="input mt-1"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={8}
                    required
                  />
                  <PasswordRequirements password={form.password} />
                </label>
                <label className="block text-sm">
                  Channel / brand name
                  <input
                    className="input mt-1"
                    placeholder="e.g. Freelance Finance with Alex"
                    value={form.channel_name}
                    onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Channel URL
                  <input
                    type="url"
                    className="input mt-1"
                    placeholder="https://youtube.com/@..."
                    value={form.channel_url}
                    onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  PayPal payout email
                  <input
                    type="email"
                    className="input mt-1"
                    placeholder="Same as above if blank"
                    value={form.payout_email}
                    onChange={(e) => setForm({ ...form, payout_email: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Why is your audience a fit? (optional)
                  <textarea
                    className="input mt-1 min-h-[80px]"
                    value={form.application_note}
                    onChange={(e) => setForm({ ...form, application_note: e.target.value })}
                  />
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/affiliates/terms" className="text-accent hover:underline" target="_blank">
                      Affiliate Program Terms
                    </Link>{" "}
                    and confirm my promotions will include proper affiliate disclosure.
                  </span>
                </label>
                {error && <p className="text-sm text-red">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Submitting…" : "Submit application"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
