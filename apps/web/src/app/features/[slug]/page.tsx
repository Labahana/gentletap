import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FEATURE_SLUGS, getFeature } from "@/lib/features";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) {
    return { title: "Not found" };
  }
  return pageMetadata({
    title: feature.metaTitle,
    description: feature.metaDescription,
    path: `/features/${feature.slug}`,
    keywords: feature.keywords,
  });
}

export default async function FeaturePage({ params }: PageProps) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(feature.title, feature.metaDescription, `/features/${feature.slug}`),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
            { name: feature.name, path: `/features/${feature.slug}` },
          ]),
          howToJsonLd(feature.title, feature.metaDescription, feature.howItWorks),
          faqJsonLd(feature.faq),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <nav className="text-sm text-muted">
            <Link href="/features" className="text-accent hover:underline">
              Features
            </Link>
            <span className="mx-2">/</span>
            <span>{feature.name}</span>
          </nav>
          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-accent">
            {feature.name}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {feature.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{feature.hero}</p>
          <div className="mt-8">
            <Link href="/signup" className="btn-primary">
              Try it free
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Why it matters</h2>
            <div className="mt-8 space-y-4">
              {feature.benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-xl border border-border bg-card/50 px-5 py-4">
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{benefit.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">How it works</h2>
            <ol className="mt-8 space-y-6">
              {feature.howItWorks.map((step, index) => (
                <li key={step.name} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{step.name}</h3>
                    <span className="text-xs font-medium uppercase tracking-wide text-accent">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {feature.faq.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">See {feature.name.toLowerCase()} on your invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks and preview GentleTap against your real open
              invoices — free for 5 collections a month, no credit card.
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
