import Link from "next/link";

import { AffiliateApplyForm } from "@/components/affiliate-apply-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_REFERRAL_DISCOUNT_MONTHS,
  AFFILIATE_REFERRAL_DISCOUNT_PERCENT,
  maxCommissionPerPlan,
  referralDiscountLabel,
} from "@/lib/affiliate-program";
import { LEGAL } from "@/lib/legal";
import {
  AFFILIATE_AUDIENCE,
  AFFILIATE_FAQ,
  AFFILIATE_PROGRAM_COMPARE,
  AFFILIATE_WHY_PROMOTE,
} from "@/lib/seo-content";

const EARNINGS = [
  { plan: "Pro", price: 19, earn: 5.7 },
  { plan: "Pro+", price: 39, earn: 11.7 },
  { plan: "Team", price: 59, earn: 17.7 },
] as const;

const COMMISSION_PERCENT = Math.round(AFFILIATE_COMMISSION_RATE * 100);

export default function AffiliatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            SaaS affiliate program · QuickBooks freelancers
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            GentleTap affiliate program — earn {COMMISSION_PERCENT}% for {AFFILIATE_COMMISSION_MONTHS}{" "}
            months per referral
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Built for YouTube creators and freelance business educators. Refer automated invoice
            follow-up software for QuickBooks + Gmail — earn {COMMISSION_PERCENT}% on every
            subscription payment for {AFFILIATE_COMMISSION_MONTHS} months. Your audience gets{" "}
            <strong className="text-foreground">{referralDiscountLabel()}</strong> when they upgrade
            through your link.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="btn-primary">
              Apply to the program
            </a>
            <Link href="/affiliates/login" className="btn-secondary">
              Creator login
            </Link>
            <Link href="/affiliates/terms" className="btn-secondary">
              Program terms
            </Link>
          </div>
        </article>

        <section className="border-y border-border bg-accent/5 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Your audience gets {referralDiscountLabel()}</h2>
            <p className="mt-4 max-w-2xl text-muted">
              Referred customers who upgrade to Pro, Pro+, or Team receive{" "}
              {AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off their first {AFFILIATE_REFERRAL_DISCOUNT_MONTHS}{" "}
              paid months — applied automatically at checkout when they use your link (e.g.{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-sm">
                {LEGAL.websiteDisplay}/signup?ref=yourcode
              </code>
              ). This gives creators a concrete hook beyond &ldquo;check out this tool.&rdquo;
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted">
              <li>
                <strong className="text-foreground">Pro example:</strong> $19/mo → $
                {(19 * (1 - AFFILIATE_REFERRAL_DISCOUNT_PERCENT / 100)).toFixed(2)}/mo for months 1–
                {AFFILIATE_REFERRAL_DISCOUNT_MONTHS}, then standard pricing.
              </li>
              <li>
                <strong className="text-foreground">You still earn:</strong> {COMMISSION_PERCENT}% on
                what they actually pay each month (including discounted months).
              </li>
              <li>
                <strong className="text-foreground">Free Starter tier</strong> is unchanged — no
                credit card required to try; discount applies when they choose a paid plan.
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-border bg-card/40 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Affiliate earnings per referred customer</h2>
            <p className="mt-3 text-muted">
              Recurring commission on every renewal payment for up to {AFFILIATE_COMMISSION_MONTHS}{" "}
              months from their first purchase.
            </p>
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
              50 Pro referrals in month 1 ≈{" "}
              <strong className="text-foreground">$285/month</strong> in commissions. See{" "}
              <Link href="/affiliates/terms" className="text-accent hover:underline">
                program terms
              </Link>{" "}
              for payout schedule and clawbacks.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">Who should join the GentleTap affiliate program</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {AFFILIATE_AUDIENCE.map((item) => (
              <div key={item.title} className="card">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Why creators promote invoice reminder software</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {AFFILIATE_WHY_PROMOTE.map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">How the affiliate program works</h2>
          <ol className="mt-8 space-y-4 text-muted">
            <li>
              <strong className="text-foreground">1. Apply</strong> — tell us about your channel.
              We approve creators whose audience matches freelancers using QuickBooks.
            </li>
            <li>
              <strong className="text-foreground">2. Share your link + discount</strong> — promote{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-sm">
                {LEGAL.websiteDisplay}/?ref=yourcode
              </code>{" "}
              with {referralDiscountLabel()} for your audience.
            </li>
            <li>
              <strong className="text-foreground">3. Track conversions</strong> — clicks, signups,
              active subscribers, and earnings in your creator dashboard.
            </li>
            <li>
              <strong className="text-foreground">4. Earn for {AFFILIATE_COMMISSION_MONTHS} months</strong> —{" "}
              {COMMISSION_PERCENT}% on each subscription payment per referred customer.
            </li>
            <li>
              <strong className="text-foreground">5. Get paid</strong> — monthly PayPal payouts (net
              30, $50 minimum).
            </li>
          </ol>
        </section>

        <section className="border-t border-border bg-card/20 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">GentleTap vs typical SaaS affiliate programs</h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-3 pr-4 font-medium">Feature</th>
                    <th className="py-3 pr-4 font-medium">GentleTap</th>
                    <th className="py-3 font-medium">Typical SaaS</th>
                  </tr>
                </thead>
                <tbody>
                  {AFFILIATE_PROGRAM_COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                      <td className="py-3 pr-4 text-accent">{row.gentletap}</td>
                      <td className="py-3 text-muted">{row.typical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">Related resources for affiliates</h2>
          <p className="mt-3 text-muted">
            Understand the product before you promote it — these pages match what your audience
            searches for.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>
              <Link href="/quickbooks-payment-reminders" className="text-accent hover:underline">
                QuickBooks payment reminders guide
              </Link>
            </li>
            <li>
              <Link
                href="/invoice-follow-up-email-templates-for-freelancers"
                className="text-accent hover:underline"
              >
                Invoice follow-up email templates for freelancers
              </Link>
            </li>
            <li>
              <Link href="/quickbooks-reminders-vs-gentletap" className="text-accent hover:underline">
                QuickBooks reminders vs GentleTap
              </Link>
            </li>
            <li>
              <Link href="/integrations/quickbooks" className="text-accent hover:underline">
                QuickBooks Online integration overview
              </Link>
            </li>
          </ul>
        </section>

        <section className="border-t border-border bg-card/20 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Affiliate program FAQ</h2>
            <dl className="mt-8 space-y-6">
              {AFFILIATE_FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-2 text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="apply" className="border-t border-border bg-card/30 py-14">
          <div className="mx-auto max-w-lg px-6">
            <h2 className="text-2xl font-bold">Apply to the affiliate program</h2>
            <p className="mt-2 text-sm text-muted">
              Tell us about your channel. Approved creators get a referral link, audience discount,
              and dashboard access.
            </p>
            <AffiliateApplyForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
