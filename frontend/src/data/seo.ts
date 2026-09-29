/** SEO constants + schema.org JSON-LD builders (ported from old Next.js seo.ts). */

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

/** Feature pages kept indexable + in sitemap; the rest stay live but noindex (thin/overlapping). */
export const INDEXED_FEATURE_SLUGS = [
  "ai-reminder-drafts",
  "send-from-gmail",
  "auto-stop-on-payment",
  "whatsapp-reminders",
] as const;

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
    logo: `${SITE_URL}/logo512.png`,
    description: DEFAULT_DESCRIPTION,
    email: "support@gentletap.co",
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
    image: [`${SITE_URL}/og-image.jpg`],
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
        url: `${SITE_URL}/logo512.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${input.path}` },
  };
}

/** Live plan pricing (mirrors backend PLAN_PRICES). */
export const PRICING_PLANS = [
  { name: "Starter", monthly: 0 },
  { name: "Pro", monthly: 19 },
  { name: "Pro+", monthly: 39 },
  { name: "Team", monthly: 59 },
] as const;

export function pricingOffersJsonLd(plans: ReadonlyArray<{ name: string; monthly: number }> = PRICING_PLANS) {
  const prices = plans.map((p) => p.monthly);
  return {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: plans.length,
    availability: "https://schema.org/InStock",
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: `GentleTap ${p.name}`,
      price: p.monthly.toFixed(2),
      priceCurrency: "USD",
      url: `${SITE_URL}/signup`,
    })),
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PRODUCT_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    featureList: [
      "Automated invoice reminder sequences",
      "AI-drafted follow-up emails in your voice",
      "Send reminders from your own Gmail",
      "QuickBooks Online sync",
      "FreshBooks sync",
      "WhatsApp invoice reminders",
      "Automatic stop the moment an invoice is paid",
      "Escalation rules and smart rescheduling",
      "Client payment behavior profiles",
      "Autopilot control center",
      "CSV invoice import",
    ],
    audience: {
      "@type": "Audience",
      audienceType: "Freelancers, consultants, and small agencies",
    },
    offers: pricingOffersJsonLd(),
  };
}

export function productPricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${PRODUCT_NAME} — Payment reminder software`,
    description: DEFAULT_DESCRIPTION,
    brand: { "@type": "Brand", name: PRODUCT_NAME },
    image: `${SITE_URL}/og-image.jpg`,
    offers: pricingOffersJsonLd(),
  };
}

export function collectionPageJsonLd(
  name: string,
  description: string,
  path: string,
  items: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", name: PRODUCT_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: `${SITE_URL}${item.path}`,
      })),
    },
  };
}

export function affiliateProgramJsonLd(input?: {
  firstMonthRate?: number;
  baseRate?: number;
  commissionMonths?: number;
  founderRate?: number;
  founderMonths?: number;
  founderLimit?: number;
}) {
  const firstMonthPct = Math.round((input?.firstMonthRate ?? 0.5) * 100);
  const basePct = Math.round((input?.baseRate ?? 0.3) * 100);
  const months = input?.commissionMonths ?? 24;
  const founderPct = Math.round((input?.founderRate ?? 0.4) * 100);
  const founderMonths = input?.founderMonths ?? 6;
  const founderLimit = input?.founderLimit ?? 25;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "GentleTap Affiliate Program",
    description: `Earn ${firstMonthPct}% of each referral's first month plus ${basePct}% recurring for ${months} months. Founding partners (first ${founderLimit}) earn ${founderPct}% for ${founderMonths} months.`,
    url: `${SITE_URL}/affiliates`,
    isPartOf: { "@type": "WebSite", name: PRODUCT_NAME, url: SITE_URL },
    about: organizationJsonLd(),
    mainEntity: {
      "@type": "Service",
      name: "GentleTap Affiliate Program",
      serviceType: "Affiliate marketing program",
      provider: { "@type": "Organization", name: PRODUCT_NAME, url: SITE_URL },
      areaServed: "Worldwide",
      audience: {
        "@type": "BusinessAudience",
        name: "YouTube creators, newsletter writers, accountants and bookkeepers",
      },
      offer: [
        {
          "@type": "Offer",
          name: `${firstMonthPct}% first-month commission + ${basePct}% recurring for ${months} months`,
          price: "0",
          priceCurrency: "USD",
          url: `${SITE_URL}/affiliates`,
          description: `Free to join. ${firstMonthPct}% of each referral's first paid month, then ${basePct}% of every subscription payment for ${months} months. Automatic performance tiers up to 40%.`,
        },
        {
          "@type": "Offer",
          name: `Founding partner rate: ${founderPct}% recurring for ${founderMonths} months`,
          price: "0",
          priceCurrency: "USD",
          url: `${SITE_URL}/affiliates`,
          description: `The first ${founderLimit} approved partners earn a ${founderPct}% renewal rate for their first ${founderMonths} months in the program.`,
        },
      ],
    },
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
  {
    path: "/invoice-follow-up-guide",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  { path: "/features", changeFrequency: "monthly", priority: 0.85 },
  ...INDEXED_FEATURE_SLUGS.map((slug) => ({
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
];
