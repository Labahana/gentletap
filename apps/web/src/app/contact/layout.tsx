import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact GentleTap — support, billing & privacy",
  description:
    "Contact GentleTap for product support, billing questions, privacy requests, and QuickBooks integration help. Global SaaS for automated invoice payment reminders.",
  path: "/contact",
  keywords: ["GentleTap contact", "payment reminder software support", "QuickBooks integration help"],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
