import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/** Public marketing pages — allow AI crawlers for GEO citations. */
const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai", "PerplexityBot"] as const;

const DISALLOW = [
  "/dashboard",
  "/dashboard/",
  "/settings",
  "/settings/",
  "/onboarding",
  "/admin",
  "/admin/",
  "/auth/",
  "/integrations/quickbooks/disconnected",
  "/v1/",
  "/reset-password",
  "/forgot-password",
  "/login",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/" as const,
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
