import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "QuickBooks Online integration",
  description:
    "How GentleTap connects to QuickBooks Online for automated invoice payment reminders — read-only sync, payment detection, and reminder stop on paid invoices.",
  path: "/integrations/quickbooks",
  keywords: [
    "QuickBooks payment reminders",
    "QuickBooks invoice follow up",
    "QuickBooks Online integration",
    "automated accounts receivable QuickBooks",
  ],
});

export default function QuickBooksIntegrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
