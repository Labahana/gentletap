import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllComparisons } from "@/lib/competitor-comparisons";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Compare GentleTap — Invoice Reminder Alternatives (2026)",
  description:
    "Honest comparisons: GentleTap vs Bonsai, Chaser, Melio, Paidnice, Landolio, HoneyBook, DueDrop, and more. Find the right QuickBooks payment follow-up tool for freelancers.",
  path: "/compare",
  keywords: [
    "GentleTap alternatives",
    "invoice reminder software comparison",
    "GentleTap vs Chaser",
    "GentleTap vs Bonsai",
    "GentleTap vs Melio",
    "QuickBooks payment reminder tools",
    "best invoice follow up software freelancers",
  ],
});

export default function CompareHubPage() {
  const comparisons = getAllComparisons();
  const title = "Compare GentleTap to invoice reminder alternatives";

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(
            title,
            "Honest side-by-side comparisons of GentleTap vs Bonsai, Chaser, Melio, Paidnice, Landolio, and other invoice follow-up tools.",
            "/compare",
          ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compare", path: "/compare" },
          ]),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Compare · 2026</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            GentleTap vs invoice reminder alternatives
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            We built GentleTap for QuickBooks freelancers who want AI follow-ups from Gmail — not
            enterprise AR software. These pages are honest: we say when a competitor is the better
            fit, not just when GentleTap wins.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Try GentleTap free
            </Link>
            <Link href="/quickbooks-reminders-vs-gentletap" className="btn-secondary">
              vs QuickBooks reminders
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">All comparisons</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {comparisons.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/compare/${c.slug}`}
                    className="card block h-full transition-colors hover:border-accent/40"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-accent">
                      {c.category}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">GentleTap vs {c.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{c.tagline}</p>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/quickbooks-reminders-vs-gentletap"
                  className="card block h-full transition-colors hover:border-accent/40"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    Built-in · QuickBooks Online
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">GentleTap vs QuickBooks reminders</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Compare QBO&apos;s generic scheduled reminders with AI Gmail follow-ups.
                  </p>
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-14 rounded-2xl border border-border bg-background px-6 py-8">
            <h2 className="text-lg font-semibold">How we write these comparisons</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              <li>· We note when competitors are cheaper, more complete, or better for your stack.</li>
              <li>· Pricing is sourced from public pages and may change — verify before buying.</li>
              <li>· GentleTap is not accounting software, a CRM, or a payment processor.</li>
              <li>· Last reviewed: July 2026.</li>
            </ul>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
