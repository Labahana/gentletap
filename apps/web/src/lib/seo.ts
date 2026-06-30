import type { Metadata } from "next";

import { LEGAL } from "@/lib/legal";

export const SITE_URL = LEGAL.websiteUrl;

/** Primary + secondary terms — clustered by intent (see cac-plan.md). */
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
} as const;

export const SEO_KEYWORDS = [
  ...SEO_KEYWORD_CLUSTERS.brand,
  ...SEO_KEYWORD_CLUSTERS.quickbooks,
  ...SEO_KEYWORD_CLUSTERS.templates,
  ...SEO_KEYWORD_CLUSTERS.howTo,
  ...SEO_KEYWORD_CLUSTERS.product,
  "overdue invoice follow up",
  "get clients to pay on time",
  "accounts receivable automation",
  "client payment follow up",
] as const;

export const DEFAULT_TITLE =
  "GentleTap — QuickBooks Payment Reminders for Freelancers | Gmail";
export const DEFAULT_DESCRIPTION =
  "Automated invoice follow-up for freelancers on QuickBooks Online. AI-drafted payment reminders send from your Gmail and stop when clients pay — polite, not pushy. Free for 5 invoices.";

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export const INDEX_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
};

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  ogTitle?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  keywords = SEO_KEYWORDS,
  ogTitle,
}: PageSeoInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes("GentleTap") ? title : `${title} | GentleTap`;

  return {
    title: fullTitle,
    description,
    keywords: [...keywords],
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      title: ogTitle ?? fullTitle,
      description,
      url,
      siteName: LEGAL.productName,
      locale: "en_US",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle ?? fullTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: LEGAL.productName,
    legalName: LEGAL.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/icon-512.png`,
    email: LEGAL.supportEmail,
    description: DEFAULT_DESCRIPTION,
    sameAs: [] as string[],
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: LEGAL.productName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    offers: pricingOffersJsonLd(),
    featureList: [
      "QuickBooks Online invoice sync (read-only access)",
      "AI-personalized payment reminder emails per invoice and client",
      "Send from Gmail or verified custom domain",
      "Multi-step escalation sequences (due date through 30+ days overdue)",
      "WhatsApp payment reminders on Pro+ and Team — email first, WhatsApp ~3h later on steps 1–3",
      "Preview and approve drafts before first send",
      "Automatic stop when QuickBooks invoice balance hits zero",
      "Per-invoice pause and resume",
      "CSV invoice import with payment link support",
      "WhatsApp follow-ups on Pro+ and Team plans",
      "Free Starter plan — 5 invoice collections per month",
    ],
    audience: {
      "@type": "Audience",
      audienceType: "Freelancers and consultants using QuickBooks Online and Gmail",
    },
  };
}

type PricingPlan = {
  id: string;
  name: string;
  price_monthly: number;
};

/** Schema.org offers for Starter, Pro, Pro+, Team — supports rich-result eligibility. */
export function pricingOffersJsonLd(
  plans: readonly PricingPlan[] = [
    { id: "free", name: "Starter", price_monthly: 0 },
    { id: "pro", name: "Pro", price_monthly: 19 },
    { id: "pro_plus", name: "Pro+", price_monthly: 39 },
    { id: "team", name: "Team", price_monthly: 59 },
  ],
) {
  const paid = plans.filter((p) => p.price_monthly > 0);
  const low = Math.min(...plans.map((p) => p.price_monthly));
  const high = Math.max(...paid.map((p) => p.price_monthly), 0);

  return {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: String(low),
    highPrice: String(high),
    offerCount: plans.length,
    offers: plans.map((plan) => ({
      "@type": "Offer",
      name: `${plan.name} plan`,
      price: String(plan.price_monthly),
      priceCurrency: "USD",
      url: `${SITE_URL}/signup`,
      availability: "https://schema.org/InStock",
      description:
        plan.price_monthly === 0
          ? "Free Starter plan with 5 invoice collections per month"
          : `$${plan.price_monthly}/month — unlimited invoice collections`,
    })),
  };
}

export function productPricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${LEGAL.productName} — Payment reminder software`,
    description: DEFAULT_DESCRIPTION,
    brand: { "@type": "Brand", name: LEGAL.productName },
    url: SITE_URL,
    offers: pricingOffersJsonLd(),
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
    isPartOf: { "@type": "WebSite", name: LEGAL.productName, url: SITE_URL },
  };
}

/** Structured data for the public affiliate program landing page. */
export function affiliateProgramJsonLd(
  description: string,
  commissionMonths: number,
  commissionRatePercent: number,
  referralDiscountPercent: number,
  referralDiscountMonths: number,
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "GentleTap Affiliate Program",
    description,
    url: `${SITE_URL}/affiliates`,
    isPartOf: { "@type": "WebSite", name: LEGAL.productName, url: SITE_URL },
    mainEntity: {
      "@type": "Service",
      name: "GentleTap Affiliate Program",
      serviceType: "Affiliate marketing program",
      provider: {
        "@type": "Organization",
        name: LEGAL.productName,
        legalName: LEGAL.legalName,
        url: SITE_URL,
      },
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "YouTube creators, freelance educators, and content publishers",
      },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: `${commissionRatePercent}% recurring commission for ${commissionMonths} months per referred subscription`,
          url: `${SITE_URL}/affiliates`,
        },
        {
          "@type": "Offer",
          priceCurrency: "USD",
          description: `${referralDiscountPercent}% discount for referred customers on their first ${referralDiscountMonths} paid months`,
          url: `${SITE_URL}/affiliates`,
        },
      ],
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: LEGAL.productName,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: LEGAL.productName,
      url: SITE_URL,
    },
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

/** Public marketing URLs for sitemap.xml */
export const SITEMAP_PATHS: Array<{ path: string; changeFrequency: "weekly" | "monthly"; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/quickbooks-payment-reminders", changeFrequency: "weekly", priority: 0.95 },
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
  { path: "/quickbooks-reminders-vs-gentletap", changeFrequency: "weekly", priority: 0.92 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.9 },
  { path: "/integrations/quickbooks", changeFrequency: "monthly", priority: 0.85 },
  { path: "/affiliates", changeFrequency: "weekly", priority: 0.92 },
  { path: "/affiliates/terms", changeFrequency: "monthly", priority: 0.75 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/refund", changeFrequency: "monthly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "monthly", priority: 0.2 },
  { path: "/llms.txt", changeFrequency: "monthly", priority: 0.6 },
];
