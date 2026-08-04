import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllIndustries } from "@/lib/industries";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PAGE_TITLE = "Invoice Reminders by Industry — GentleTap";
const PAGE_DESCRIPTION =
  "Automated invoice follow-up tailored to how your industry bills and chases: freelancers, agencies, consultants, contractors, and more — from your Gmail, synced with QuickBooks or FreshBooks.";

export const metadata: Metadata = pageMetadata({
  title: "Invoice Reminders for Your Industry",
  description: PAGE_DESCRIPTION,
  path: "/industries",
  keywords: [
    "invoice reminders by industry",
    "invoice chasing software",
    "payment follow up for small business",
  ],
});

export default function IndustriesIndexPage() {
  const industries = getAllIndustries();
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, "/industries"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Industries", path: "/industries" },
          ]),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Built for how you bill
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Invoice follow-up, tuned to your industry
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Late payment looks different in every trade. GentleTap runs the same reliable cadence
            for all of them — polite reminders from your Gmail, stopped the moment QuickBooks or
            FreshBooks shows the balance paid.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="card group flex flex-col transition-colors hover:border-accent/50"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {industry.audience}
                </p>
                <h2 className="mt-3 text-lg font-semibold leading-snug group-hover:text-accent">
                  {industry.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{industry.hero}</p>
                <span className="mt-4 text-sm font-medium text-accent">See the playbook →</span>
              </Link>
            ))}
          </div>

          <section className="mt-16 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Same engine, every industry</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks once, and GentleTap follows up on every overdue
              invoice from your Gmail — free for 5 collections a month.
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
