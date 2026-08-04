import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  COMPETITOR_SLUGS,
  getAllComparisons,
  getCompetitorComparison,
} from "@/lib/competitor-comparisons";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getCompetitorComparison(slug);
  if (!comparison) {
    return { title: "Not found" };
  }
  return pageMetadata({
    title: `${comparison.name} Alternatives for Invoice Follow-Up (2026)`,
    description: `Looking for a ${comparison.name} alternative? Honest breakdown of where ${comparison.name} wins, where it falls short, and how GentleTap compares for automated invoice chasing.`,
    path: `/alternatives/${comparison.slug}`,
    keywords: [
      `${comparison.name} alternative`,
      `${comparison.name} alternatives`,
      `${comparison.name} vs GentleTap`,
      "invoice chasing software alternative",
    ],
  });
}

export default async function AlternativePage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = getCompetitorComparison(slug);
  if (!comparison) {
    notFound();
  }
  const others = getAllComparisons()
    .filter((item) => item.slug !== comparison.slug)
    .slice(0, 4);

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(
            `${comparison.name} alternatives`,
            comparison.metaDescription,
            `/alternatives/${comparison.slug}`,
          ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Alternatives", path: "/alternatives" },
            { name: `${comparison.name} alternatives`, path: `/alternatives/${comparison.slug}` },
          ]),
          faqJsonLd(comparison.faq),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <nav className="text-sm text-muted">
            <Link href="/alternatives" className="text-accent hover:underline">
              Alternatives
            </Link>
            <span className="mx-2">/</span>
            <span>{comparison.name}</span>
          </nav>
          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-accent">
            {comparison.category}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            The best {comparison.name} alternatives for invoice follow-up
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{comparison.tagline}.</p>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">What {comparison.name} does</h2>
            <p className="leading-relaxed text-muted">{comparison.competitorSummary}</p>
            <p className="text-sm text-muted">{comparison.pricingNote}</p>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Where {comparison.name} genuinely wins</h2>
            <p className="leading-relaxed text-muted">{comparison.whenTheyWin}</p>
          </section>

          <section className="mt-14 space-y-4 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-6">
            <h2 className="text-2xl font-bold">The main alternative: GentleTap</h2>
            <p className="leading-relaxed text-muted">{comparison.gentletapSummary}</p>
            <p className="leading-relaxed text-muted">{comparison.whenGentletapWins}</p>
            <div className="pt-2">
              <Link href="/signup" className="btn-primary">
                Try GentleTap free
              </Link>
              <Link
                href={`/compare/${comparison.slug}`}
                className="btn-secondary ml-3 inline-flex"
              >
                Full {comparison.name} comparison
              </Link>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Feature-by-feature</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="py-3 pr-4 font-medium">Feature</th>
                    <th className="py-3 pr-4 font-medium">{comparison.name}</th>
                    <th className="py-3 font-medium">GentleTap</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4 font-medium">{row.feature}</td>
                      <td className="py-3 pr-4 text-muted">{row.competitor}</td>
                      <td className="py-3 text-muted">{row.gentletap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">The honest verdict</h2>
            <p className="leading-relaxed text-muted">{comparison.honestVerdict}</p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {comparison.faq.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {others.length > 0 && (
            <section className="mt-14">
              <h2 className="text-2xl font-bold">Other alternatives people compare</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {others.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/alternatives/${item.slug}`}
                    className="card group transition-colors hover:border-accent/50"
                  >
                    <h3 className="font-semibold leading-snug group-hover:text-accent">
                      {item.name} alternatives
                    </h3>
                    <p className="mt-2 text-sm text-muted">{item.category}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Judge GentleTap on your own invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks, preview AI-drafted reminders for your real open
              invoices, and decide with evidence — free for 5 collections a month.
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
