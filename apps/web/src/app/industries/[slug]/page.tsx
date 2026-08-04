import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { INDUSTRY_SLUGS, getIndustry } from "@/lib/industries";
import {
  INDEXED_INDUSTRY_SLUGS,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  HOLD_NOINDEX_METADATA,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) {
    return { title: "Not found" };
  }
  const meta = pageMetadata({
    title: industry.metaTitle,
    description: industry.metaDescription,
    path: `/industries/${industry.slug}`,
    keywords: industry.keywords,
  });
  const indexed = (INDEXED_INDUSTRY_SLUGS as readonly string[]).includes(slug);
  return indexed ? meta : { ...meta, ...HOLD_NOINDEX_METADATA };
}

export default async function IndustryPage({ params }: PageProps) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(industry.title, industry.metaDescription, `/industries/${industry.slug}`),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Industries", path: "/industries" },
            { name: industry.audience, path: `/industries/${industry.slug}` },
          ]),
          faqJsonLd(industry.faq),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <nav className="text-sm text-muted">
            <Link href="/industries" className="text-accent hover:underline">
              Industries
            </Link>
            <span className="mx-2">/</span>
            <span>{industry.audience}</span>
          </nav>
          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-accent">
            For {industry.audience.toLowerCase()}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {industry.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{industry.hero}</p>
          <div className="mt-8">
            <Link href="/signup" className="btn-primary">
              Automate follow-ups free
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Why chasing breaks down for {industry.audience.toLowerCase()}</h2>
            <div className="mt-8 space-y-4">
              {industry.painPoints.map((point) => (
                <div key={point.title} className="rounded-xl border border-border bg-card/50 px-5 py-4">
                  <h3 className="font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{point.body}</p>
                </div>
              ))}
            </div>
          </section>

          {industry.sections.map((section) => (
            <section key={section.heading} className="mt-14 space-y-4">
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {industry.faq.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Chase less, bill more</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks, preview AI-drafted reminders for your real
              invoices, and turn on autopilot — free for up to 5 collections a month.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free — no credit card
            </Link>
          </section>

          <p className="mt-12 text-sm text-muted">
            Related reading:{" "}
            <Link href="/blog/stop-chasing-invoices" className="text-accent hover:underline">
              How to stop chasing invoices
            </Link>{" "}
            ·{" "}
            <Link href="/how-to-follow-up-on-overdue-invoices" className="text-accent hover:underline">
              Overdue invoice follow-up timeline
            </Link>{" "}
            ·{" "}
            <Link
              href="/invoice-follow-up-email-templates-for-freelancers"
              className="text-accent hover:underline"
            >
              Follow-up email templates
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
