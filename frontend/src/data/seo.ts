/** SEO constants + schema.org JSON-LD builders (ported from old Next.js seo.ts). */

import { FEATURE_SLUGS as FEATURE_SITEMAP_SLUGS } from "./features";

export const SITE_URL = "https://gentletap.co";
export const PRODUCT_NAME = "GentleTap";

/** Primary + secondary terms — clustered by intent. */
export const SEO_KEYWORD_CLUSTERS = {
  brand: ["GentleTap", "GentleTap payment reminders"],
  quickbooks: [
    "QuickBooks payment reminders",
    "QuickBooks invoice reminders",
    "automated invoice follow up QuickBooks",
    "quickbooks send payment reminder",
    "QuickBooks Online payment reminder",
  ],
  templates: [
    "invoice follow-up email templates for freelancers",
    "freelancer invoice reminder email",
    "overdue invoice email template",
    "payment follow up email template",
    "polite payment reminder email",
  ],
  howTo: [
    "how to follow up on overdue invoice",
    "how to follow up on overdue invoice without being annoying",
    "how to chase unpaid invoices as a freelancer",
    "follow up on unpaid invoice",
  ],
  product: [
    "payment reminder software",
    "invoice reminder software",
    "automated payment reminders",
    "invoice chasing software",
    "freelance invoice reminders",
    "send payment reminders from Gmail",
  ],
  compare: [
    "GentleTap vs Bonsai",
    "GentleTap vs Chaser",
    "GentleTap vs Melio",
    "GentleTap vs Paidnice",
    "GentleTap vs Landolio",
    "GentleTap vs HoneyBook",
    "invoice dunning software",
    "invoice reminder software comparison",
  ],
} as const;

export const SEO_KEYWORDS = [
  ...SEO_KEYWORD_CLUSTERS.brand,
  ...SEO_KEYWORD_CLUSTERS.quickbooks,
  ...SEO_KEYWORD_CLUSTERS.templates,
  ...SEO_KEYWORD_CLUSTERS.howTo,
  ...SEO_KEYWORD_CLUSTERS.product,
  ...SEO_KEYWORD_CLUSTERS.compare,
  "overdue invoice follow up",
  "get clients to pay on time",
  "accounts receivable automation",
  "client payment follow up",
] as const;

export const DEFAULT_TITLE =
  "Automated QuickBooks Invoice Reminders for Freelancers | GentleTap";
export const DEFAULT_DESCRIPTION =
  "GentleTap drafts and sends personalized QuickBooks and FreshBooks invoice follow-ups from your Gmail, then stops when clients pay. Start free with up to 5 collections.";

/** Competitors kept in the public sitemap — strongest commercial intent only. */
export const SITEMAP_COMPARE_SLUGS = [
  "chasivo",
  "chaser",
  "paidnice",
  "bonsai",
  "freshbooks",
  "chaseai",
] as const;

/** Industries kept indexable + in sitemap. Others stay live but noindex. */
export const INDEXED_INDUSTRY_SLUGS = ["freelancers", "consultants", "agencies"] as const;

/** Blog posts kept in the public sitemap. */
export const SITEMAP_BLOG_SLUGS = [
  "best-invoice-chasing-software-2026",
  "stop-chasing-invoices",
  "late-payment-statistics-2026",
  "get-paid-faster-freelancer",
  "why-clients-pay-late",
] as const;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PRODUCT_NAME,
    legalName: PRODUCT_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/icon-512.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PRODUCT_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: PRODUCT_NAME,
      url: SITE_URL,
    },
  };
}

export function faqJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function webPageJsonLd(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", name: PRODUCT_NAME, url: SITE_URL },
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function howToJsonLd(
  name: string,
  description: string,
  steps: ReadonlyArray<{ name: string; text: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      "@type": "Organization",
      name: PRODUCT_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: PRODUCT_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/brand/icon-512.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${input.path}` },
  };
}

/** Public marketing URLs for sitemap.xml — pruned to high-intent pages (SEO audit Aug 2026). */
export const SITEMAP_PATHS: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/quickbooks-payment-reminders", changeFrequency: "weekly", priority: 0.95 },
  { path: "/freshbooks-invoice-reminders", changeFrequency: "weekly", priority: 0.94 },
  { path: "/quickbooks-invoice-automation", changeFrequency: "weekly", priority: 0.93 },
  { path: "/quickbooks-reminders-vs-gentletap", changeFrequency: "weekly", priority: 0.92 },
  {
    path: "/invoice-follow-up-email-templates-for-freelancers",
    changeFrequency: "weekly",
    priority: 0.94,
  },
  {
    path: "/how-to-follow-up-on-overdue-invoices",
    changeFrequency: "weekly",
    priority: 0.94,
  },
  { path: "/features", changeFrequency: "monthly", priority: 0.85 },
  ...FEATURE_SITEMAP_SLUGS.map((slug) => ({
    path: `/features/${slug}` as const,
    changeFrequency: "monthly" as const,
    priority: 0.84,
  })),
  { path: "/industries", changeFrequency: "monthly", priority: 0.85 },
  ...INDEXED_INDUSTRY_SLUGS.map((slug) => ({
    path: `/industries/${slug}` as const,
    changeFrequency: "monthly" as const,
    priority: 0.86,
  })),
  { path: "/compare", changeFrequency: "weekly", priority: 0.9 },
  { path: "/alternatives", changeFrequency: "monthly", priority: 0.88 },
  ...SITEMAP_COMPARE_SLUGS.map((slug) => ({
    path: `/compare/${slug}` as const,
    changeFrequency: "monthly" as const,
    priority: slug === "chasivo" ? 0.92 : 0.88,
  })),
  { path: "/blog", changeFrequency: "weekly", priority: 0.88 },
  ...SITEMAP_BLOG_SLUGS.map((slug) => ({
    path: `/blog/${slug}` as const,
    changeFrequency: "monthly" as const,
    priority: slug.startsWith("best-") ? 0.9 : 0.86,
  })),
  { path: "/xero-invoice-reminders", changeFrequency: "monthly", priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.9 },
  { path: "/affiliates", changeFrequency: "weekly", priority: 0.85 },
  { path: "/affiliates/terms", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/refund", changeFrequency: "monthly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "monthly", priority: 0.2 },
  { path: "/llms.txt", changeFrequency: "monthly", priority: 0.5 },
];
