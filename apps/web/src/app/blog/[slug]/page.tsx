import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BLOG_POST_SLUGS, getBlogPost } from "@/lib/blog-posts";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  HOLD_NOINDEX_METADATA,
  pageMetadata,
  SITEMAP_BLOG_SLUGS,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_POST_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return { title: "Not found" };
  }
  const meta = pageMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
  const indexed = (SITEMAP_BLOG_SLUGS as readonly string[]).includes(slug);
  return indexed ? meta : { ...meta, ...HOLD_NOINDEX_METADATA };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    notFound();
  }
  const related = post.related
    .map((relatedSlug) => getBlogPost(relatedSlug))
    .filter((item) => item !== undefined);

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: post.title,
            description: post.metaDescription,
            path: `/blog/${post.slug}`,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
          faqJsonLd(post.faq),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <nav className="text-sm text-muted">
            <Link href="/blog" className="text-accent hover:underline">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span>{post.title}</span>
          </nav>
          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-accent">
            {post.readMinutes} min read · {post.datePublished}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{post.intro}</p>

          {post.sections.map((section) => (
            <section key={section.heading} className="mt-12 space-y-4">
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
              {post.faq.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Let GentleTap run the follow-up for you</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks or FreshBooks, preview AI-drafted reminders for your real
              invoices, and turn on autopilot — free for up to 5 collections a month.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free — no credit card
            </Link>
          </section>

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-2xl font-bold">Keep reading</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/blog/${item.slug}`}
                    className="card group transition-colors hover:border-accent/50"
                  >
                    <h3 className="font-semibold leading-snug group-hover:text-accent">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">{item.readMinutes} min read</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
