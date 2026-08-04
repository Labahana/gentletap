import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page not found | GentleTap",
  ...NOINDEX_METADATA,
};

const POPULAR = [
  { href: "/blog", label: "Freelancer payment guides" },
  { href: "/quickbooks-payment-reminders", label: "QuickBooks payment reminders" },
  { href: "/features", label: "GentleTap features" },
  { href: "/industries", label: "Invoice reminders by industry" },
  { href: "/compare", label: "Compare tools" },
  { href: "/signup", label: "Start free" },
] as const;

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-24 text-center lg:py-32">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">404</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            This page went unpaid and disappeared
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            The link you followed doesn&apos;t exist — it may have moved or been removed. Here are
            the pages people usually want.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {POPULAR.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="card text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/" className="btn-primary mt-10 inline-flex">
            Back to homepage
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
