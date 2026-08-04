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

const PAGE_TITLE = "Invoice Chasing Alternatives — Compared Honestly";
const PAGE_DESCRIPTION =
  "Looking for an alternative to your current invoice chasing or dunning tool? Honest, side-by-side comparisons of GentleTap and every major payment reminder option.";

export const metadata: Metadata = pageMetadata({
  title: "Invoice Reminder & Dunning Tool Alternatives",
  description: PAGE_DESCRIPTION,
  path: "/alternatives",
  keywords: [
    "invoice chasing software alternatives",
    "dunning software alternatives",
    "payment reminder tool comparison",
  ],
});

export default function AlternativesIndexPage() {
  const comparisons = getAllComparisons();
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, "/alternatives"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Alternatives", path: "/alternatives" },
          ]),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Switching tools?
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Every invoice chasing alternative, compared honestly
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            We compare GentleTap against each tool the way we&apos;d want to read it ourselves:
            where the other tool genuinely wins, where GentleTap wins, and who should pick which.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/alternatives/${comparison.slug}`}
                className="card group flex flex-col transition-colors hover:border-accent/50"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {comparison.category}
                </p>
                <h2 className="mt-3 text-lg font-semibold leading-snug group-hover:text-accent">
                  {comparison.name} alternatives
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {comparison.tagline}
                </p>
                <span className="mt-4 text-sm font-medium text-accent">Read the comparison →</span>
              </Link>
            ))}
          </div>

          <section className="mt-16 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Skip the research — try it on your invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks and preview GentleTap&apos;s AI reminders on your
              real open invoices. Free for 5 collections a month.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free — no credit card
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
