import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Affiliate Program Terms",
  description:
    "GentleTap Affiliate Program Terms — commission rates, referral tracking, payouts, prohibited promotion, and partner responsibilities.",
  path: "/affiliates/terms",
});

export default function AffiliateTermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
