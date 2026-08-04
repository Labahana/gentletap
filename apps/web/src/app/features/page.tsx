import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllFeatures } from "@/lib/features";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PAGE_TITLE = "GentleTap Features — Automated Invoice Follow-Up";
const PAGE_DESCRIPTION =
  "AI-drafted payment reminders sent from your Gmail, WhatsApp nudges, and automatic stop the moment invoices get paid. Explore what GentleTap does and how it works.";

export const metadata: Metadata = pageMetadata({
  title: "Features — AI Reminders, Gmail Sending, WhatsApp & Auto-Stop",
  description: PAGE_DESCRIPTION,
  path: "/features",
  keywords: [
    "payment reminder software features",
    "invoice reminder automation",
    "ai invoice follow up",
    "whatsapp invoice reminders",
  ],
});

export default function FeaturesIndexPage() {
  const features = getAllFeatures();
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, "/features"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
          ]),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            What GentleTap does
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Four things, done relentlessly
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            GentleTap isn&apos;t an AR suite with forty modules. It chases invoices better than a
            human with a spreadsheet — and stops the moment the money lands.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="card group flex flex-col transition-colors hover:border-accent/50"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {feature.name}
                </p>
                <h2 className="mt-3 text-lg font-semibold leading-snug group-hover:text-accent">
                  {feature.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{feature.hero}</p>
                <span className="mt-4 text-sm font-medium text-accent">How it works →</span>
              </Link>
            ))}
          </div>

          <section className="mt-16 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">See it on your real invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks and preview AI-drafted reminders for your actual
              open invoices — free, no credit card.
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
