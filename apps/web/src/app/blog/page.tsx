import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllBlogPosts } from "@/lib/blog-posts";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PAGE_TITLE = "The GentleTap Blog — Get Paid Without the Chase";
const PAGE_DESCRIPTION =
  "Practical guides for freelancers and small agencies on invoice follow-up, late payments, cash flow, and getting paid on time — without awkward conversations.";

export const metadata: Metadata = pageMetadata({
  title: "Blog — Invoice Follow-Up & Getting Paid Guides for Freelancers",
  description: PAGE_DESCRIPTION,
  path: "/blog",
  keywords: [
    "invoice follow up blog",
    "freelancer getting paid",
    "late payment advice",
    "accounts receivable tips freelancers",
  ],
});

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, "/blog"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Freelancer guides · getting paid
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Get paid without the chase
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Practical, no-fluff guides on invoice follow-up, late-paying clients, and freelance
            cash flow — from the team building the tool that chases invoices for you.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card group flex flex-col transition-colors hover:border-accent/50"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {post.readMinutes} min read
                </p>
                <h2 className="mt-3 text-lg font-semibold leading-snug group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                <span className="mt-4 text-sm font-medium text-accent">Read the guide →</span>
              </Link>
            ))}
          </div>

          <section className="mt-16 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Rather stop thinking about invoices entirely?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              GentleTap watches your QuickBooks or FreshBooks balances and sends polite follow-ups
              from your Gmail — stopping the moment clients pay. Free for 5 collections a month.
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
