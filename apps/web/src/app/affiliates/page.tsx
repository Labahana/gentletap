import Link from "next/link";

import { AffiliateApplyForm } from "@/components/affiliate-apply-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_COOKIE_DAYS,
  AFFILIATE_FIRST_MONTH_RATE,
  AFFILIATE_FOUNDER_TIER_MONTHS,
  AFFILIATE_FOUNDER_TIER_RATE,
  AFFILIATE_FOUNDER_TIER_SPOTS,
  AFFILIATE_PAYOUT_METHODS_LABEL,
  AFFILIATE_PAYOUT_MINIMUM,
  AFFILIATE_PAYOUT_SCHEDULE,
  AFFILIATE_REFERRAL_DISCOUNT_MONTHS,
  AFFILIATE_REFERRAL_DISCOUNT_PERCENT,
  AFFILIATE_TIERS,
  firstMonthCommission,
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
  { plan: "Pro", price: 19 },
  { plan: "Pro+", price: 39 },
  { plan: "Team", price: 59 },
] as const;

const COMMISSION_PERCENT = Math.round(AFFILIATE_COMMISSION_RATE * 100);
const FIRST_MONTH_PERCENT = Math.round(AFFILIATE_FIRST_MONTH_RATE * 100);
const FOUNDER_PERCENT = Math.round(AFFILIATE_FOUNDER_TIER_RATE * 100);

const PROOF_POINTS = [
  `${FIRST_MONTH_PERCENT}% first month`,
  `${COMMISSION_PERCENT}% × ${AFFILIATE_COMMISSION_MONTHS} months`,
  `${AFFILIATE_COOKIE_DAYS}-day cookies`,
  `$${AFFILIATE_PAYOUT_MINIMUM} payouts, ${AFFILIATE_PAYOUT_SCHEDULE}`,
  "Founder-approved",
] as const;

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
            Earn {FIRST_MONTH_PERCENT}% of the first month — plus {COMMISSION_PERCENT}% recurring
            for {AFFILIATE_COMMISSION_MONTHS} months
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            The highest-paying affiliate program for invoice software. Refer freelancers and
            agencies who use QuickBooks or FreshBooks; your audience gets{" "}
            <strong className="text-foreground">{referralDiscountLabel()}</strong>, and you get
            paid every month they stay.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {PROOF_POINTS.map((point) => (
              <li
                key={point}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted"
              >
                {point}
              </li>
            ))}
          </ul>
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

        <section className="border-y border-border bg-accent/10 py-10">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Founder tier — first {AFFILIATE_FOUNDER_TIER_SPOTS} affiliates
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              The first {AFFILIATE_FOUNDER_TIER_SPOTS} approved affiliates earn {FOUNDER_PERCENT}%
              for their first {AFFILIATE_FOUNDER_TIER_MONTHS} months
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Early partners also get a personal onboarding call with the founder, early access to
              new features worth talking about, and a swipe file with ready-to-use scripts. When
              the spots are gone, this banner comes down.
            </p>
            <a href="#apply" className="btn-primary mt-6 inline-flex">
              Claim a founder spot
            </a>
          </div>
        </section>

        <section className="border-b border-border bg-accent/5 py-14">
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
                <strong className="text-foreground">You still earn:</strong> {FIRST_MONTH_PERCENT}%
                of the first payment and {COMMISSION_PERCENT}% of every payment after — calculated
                on what they actually pay, including discounted months.
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
              {FIRST_MONTH_PERCENT}% of the first paid month up front, then {COMMISSION_PERCENT}%
              of every renewal for up to {AFFILIATE_COMMISSION_MONTHS} months from their first
              purchase.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {EARNINGS.map((row) => (
                <div key={row.plan} className="card text-center">
                  <p className="text-sm font-medium text-muted">{row.plan}</p>
                  <p className="mt-2 text-3xl font-bold">
                    ${firstMonthCommission(row.price).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    first month · then ${(row.price * AFFILIATE_COMMISSION_RATE).toFixed(2)}/mo
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    ${row.price}/mo plan · up to ${maxCommissionPerPlan(row.price).toFixed(0)} over{" "}
                    {AFFILIATE_COMMISSION_MONTHS} months
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">
              50 Pro referrals in month 1 ≈{" "}
              <strong className="text-foreground">$475 up front + $285/month</strong> from month 2.
              See{" "}
              <Link href="/affiliates/terms" className="text-accent hover:underline">
                program terms
              </Link>{" "}
              for payout schedule and clawbacks.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">Earn more as you grow — automatic performance tiers</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Your renewal rate rises automatically with the revenue you refer in a calendar month.
            No negotiation, no re-applying — your dashboard shows your tier and progress.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-3 pr-4 font-medium">Monthly referred revenue</th>
                  <th className="py-3 pr-4 font-medium">Renewal commission</th>
                  <th className="py-3 font-medium">First-month bounty</th>
                </tr>
              </thead>
              <tbody>
                {AFFILIATE_TIERS.map((tier) => (
                  <tr key={tier.minMonthlyRevenue} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {tier.minMonthlyRevenue === 0
                        ? "$0 – $499"
                        : `$${tier.minMonthlyRevenue.toLocaleString()}+`}
                    </td>
                    <td className="py-3 pr-4 text-accent">
                      {Math.round(tier.rate * 100)}%
                    </td>
                    <td className="py-3 text-muted">{FIRST_MONTH_PERCENT}% (always)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Who should join the GentleTap affiliate program</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {AFFILIATE_AUDIENCE.map((item) => (
                <div key={item.title} className="card">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <div className="card border-accent/40">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Accountants &amp; bookkeepers
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Refer clients, earn {COMMISSION_PERCENT}% for {AFFILIATE_COMMISSION_MONTHS} months —
              no extra work
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              You already answer &ldquo;how do I get clients to pay on time?&rdquo; Recommending
              GentleTap turns that answer into recurring revenue: your clients get{" "}
              {referralDiscountLabel()}, you earn commission on every payment — and you look like
              the expert who solved their cash-flow problem. We give you a one-page client
              explainer you can send as-is.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/affiliates?path=accountant#apply" className="btn-primary">
                Apply as an accountant
              </a>
              <Link href="/affiliates/resources" className="btn-secondary">
                See the client explainer
              </Link>
            </div>
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold">A real resource kit — not just a link</h2>
              <p className="mt-3 text-muted">
                Most programs hand you a URL and wish you luck. Approved GentleTap affiliates get
                newsletter templates, YouTube scripts, social copy, graphics, disclosure lines, and
                a case-study template — everything you need to publish this week.
              </p>
            </div>
            <Link href="/affiliates/resources" className="btn-secondary">
              Browse the resource kit
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              "5 newsletter email templates",
              "3 YouTube video scripts",
              "10 ready social posts",
              "Logo + screenshot pack",
              "Disclosure lines that pass FTC review",
              "Case-study template with your numbers",
            ].map((item) => (
              <li key={item} className="card py-4">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-border bg-card/20 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Affiliate spotlight</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Every month we feature the top-earning affiliate here and in our newsletter — plus
              cash bonuses for the top three ($100 / $50 / $25). The program is new: the first
              creators to publish will own this space.
            </p>
            <div className="card mt-8 border-dashed text-center">
              <p className="text-lg font-semibold">This month&apos;s spotlight: your channel here</p>
              <p className="mt-2 text-sm text-muted">
                Join the founder tier, publish your first video or post, and be our first featured
                affiliate.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">How the affiliate program works</h2>
          <ol className="mt-8 space-y-4 text-muted">
            <li>
              <strong className="text-foreground">1. Apply</strong> — tell us about your channel.
              We approve creators and accountants whose audience matches freelancers using
              QuickBooks.
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
              <strong className="text-foreground">
                4. Earn {FIRST_MONTH_PERCENT}% up front, then {COMMISSION_PERCENT}% for{" "}
                {AFFILIATE_COMMISSION_MONTHS} months
              </strong>{" "}
              — on each subscription payment per referred customer, with automatic tier upgrades to
              35–40% at volume.
            </li>
            <li>
              <strong className="text-foreground">5. Get paid</strong> — {AFFILIATE_PAYOUT_METHODS_LABEL}{" "}
              payouts ({AFFILIATE_PAYOUT_SCHEDULE}, ${AFFILIATE_PAYOUT_MINIMUM} minimum).
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
              <Link href="/affiliates/resources" className="text-accent hover:underline">
                Affiliate resource kit — scripts, templates, graphics
              </Link>
            </li>
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
              Tell us about your channel. Approved partners get a referral link, audience discount,
              the full resource kit, and dashboard access.
            </p>
            <AffiliateApplyForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
