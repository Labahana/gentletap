import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CompetitorComparison } from "@/lib/competitor-comparisons";
import {
  DEFAULT_DESCRIPTION,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  productPricingJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

type Props = {
  comparison: CompetitorComparison;
};

export function ComparisonPage({ comparison }: Props) {
  const path = `/compare/${comparison.slug}`;
  const title = `GentleTap vs ${comparison.name}`;

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(comparison.metaTitle, comparison.metaDescription, path),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compare", path: "/compare" },
            { name: comparison.name, path },
          ]),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd(comparison.faq),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <nav className="text-sm text-muted">
            <Link href="/compare" className="hover:text-foreground">
              Compare
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{comparison.name}</span>
          </nav>

          <p className="mt-6 text-sm font-medium uppercase tracking-widest text-accent">
            {comparison.category} · Honest comparison
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            GentleTap vs {comparison.name}
          </h1>
          <p className="mt-2 text-lg text-muted">{comparison.tagline}</p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {comparison.honestVerdict}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Try GentleTap free
            </Link>
            <Link href="/compare" className="btn-secondary">
              All comparisons
            </Link>
            {comparison.competitorUrl ? (
              <a
                href={comparison.competitorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Visit {comparison.name} ↗
              </a>
            ) : null}
          </div>

          <section className="mt-14 grid gap-6 sm:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold">When {comparison.name} wins</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{comparison.whenTheyWin}</p>
            </div>
            <div className="card border-accent/30 bg-accent/5">
              <h2 className="text-lg font-semibold">When GentleTap wins</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{comparison.whenGentletapWins}</p>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">What each tool does</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="card">
                <h3 className="font-semibold">{comparison.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{comparison.competitorSummary}</p>
              </div>
              <div className="card border-accent/20">
                <h3 className="font-semibold text-accent">GentleTap</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{comparison.gentletapSummary}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              <strong className="font-medium text-foreground">Pricing:</strong> {comparison.pricingNote}
            </p>
          </section>

          <section className="mt-14 overflow-x-auto">
            <h2 className="text-2xl font-bold">Feature comparison</h2>
            <table className="mt-6 w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-semibold">Feature</th>
                  <th className="py-3 pr-4 font-semibold text-muted">{comparison.name}</th>
                  <th className="py-3 font-semibold text-accent">GentleTap</th>
                </tr>
              </thead>
              <tbody>
                {comparison.comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/70">
                    <td className="py-3 pr-4 font-medium">{row.feature}</td>
                    <td className="py-3 pr-4 text-muted">{row.competitor}</td>
                    <td className="py-3">{row.gentletap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">FAQ</h2>
            <dl className="mt-8 space-y-6">
              {comparison.faq.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-border bg-background px-6 py-8">
            <h2 className="text-lg font-semibold">More comparisons</h2>
            <p className="mt-2 text-sm text-muted">
              See how GentleTap compares to other invoice reminder and AR tools — or read about{" "}
              <Link href="/quickbooks-reminders-vs-gentletap" className="text-accent hover:underline">
                QuickBooks built-in reminders
              </Link>
              .
            </p>
            <Link href="/compare" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              View all competitor comparisons →
            </Link>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Try GentleTap on your QuickBooks invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              {DEFAULT_DESCRIPTION}
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free — no credit card
            </Link>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
