import type { Metadata } from "next";

import { LEGAL } from "@/lib/legal";

export const SITE_URL = LEGAL.websiteUrl;

/** Primary + secondary terms — global freelancer / SMB SaaS (not geo-local). */
export const SEO_KEYWORDS = [
  "payment reminder software",
  "QuickBooks payment reminders",
  "automated invoice follow up",
  "accounts receivable automation",
  "invoice collection software",
  "freelance invoice reminders",
  "overdue invoice follow up",
  "AI payment reminders",
  "get clients to pay on time",
  "invoice chasing software",
  "QuickBooks invoice reminders",
  "send payment reminders from Gmail",
  "automated accounts receivable",
  "client payment follow up",
  "freelancer billing software",
] as const;

export const DEFAULT_TITLE = "GentleTap — AI Payment Reminders for Freelancers | QuickBooks";
export const DEFAULT_DESCRIPTION =
  "Stop chasing overdue invoices manually. GentleTap connects QuickBooks Online to Gmail to send polite, AI-driven payment reminders that protect client trust. Try free!";

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
      "QuickBooks Online invoice sync",
      "AI-personalized payment reminder emails",
      "Gmail and custom domain sending",
      "Automatic stop when invoice is paid",
      "WhatsApp follow-ups on Pro+ plans",
    ],
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

/** Public marketing URLs for sitemap.xml */
export const SITEMAP_PATHS: Array<{ path: string; changeFrequency: "weekly" | "monthly"; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/quickbooks-payment-reminders", changeFrequency: "weekly", priority: 0.95 },
  {
    path: "/invoice-follow-up-email-templates-for-freelancers",
    changeFrequency: "weekly",
    priority: 0.94,
  },
  { path: "/quickbooks-reminders-vs-gentletap", changeFrequency: "weekly", priority: 0.92 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.9 },
  { path: "/integrations/quickbooks", changeFrequency: "monthly", priority: 0.85 },
  { path: "/affiliates", changeFrequency: "monthly", priority: 0.88 },
  { path: "/affiliates/terms", changeFrequency: "monthly", priority: 0.75 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/refund", changeFrequency: "monthly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "monthly", priority: 0.2 },
];
