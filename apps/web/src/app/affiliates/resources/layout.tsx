import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const TITLE = "Affiliate Resource Kit — Scripts, Templates & Brand Assets";
const DESCRIPTION =
  "Ready-to-use newsletter templates, YouTube scripts, social posts, disclosure lines, and brand assets for GentleTap affiliates — plus a client explainer for accountants and bookkeepers.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/affiliates/resources",
  keywords: [
    "GentleTap affiliate resources",
    "affiliate email templates",
    "YouTube script invoice software",
    "affiliate swipe file",
    "accountant client explainer",
  ],
});

export default function AffiliateResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(TITLE, DESCRIPTION, "/affiliates/resources"), organizationJsonLd()]} />
      {children}
    </>
  );
}
