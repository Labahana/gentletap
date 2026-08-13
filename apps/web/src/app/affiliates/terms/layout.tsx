import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const TITLE = "Affiliate Program Terms";
const DESCRIPTION =
  "GentleTap Affiliate Program Terms — 50% first-month bounty plus 30% commission for 24 months, performance tiers, 60-day referral tracking, PayPal/Wise/bank payouts, FTC disclosure requirements, and partner responsibilities.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/affiliates/terms",
  keywords: [
    "GentleTap affiliate terms",
    "affiliate program agreement",
    "SaaS affiliate commission terms",
    "affiliate disclosure requirements",
  ],
});

export default function AffiliateTermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(TITLE, DESCRIPTION, "/affiliates/terms"),
          organizationJsonLd(),
        ]}
      />
      {children}
    </>
  );
}
