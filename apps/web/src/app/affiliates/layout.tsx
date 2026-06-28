import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Affiliate Program — 30% Recurring Commission",
  description:
    "Join the GentleTap affiliate program. Earn 30% recurring commission for every freelancer you refer. Built for YouTube creators and freelance business educators.",
  path: "/affiliates",
  keywords: [
    "GentleTap affiliate program",
    "SaaS affiliate program freelancers",
    "recurring commission payment reminder software",
  ],
});

export default function AffiliatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
