import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refund Policy",
  description:
    "GentleTap refund policy for subscription plans. Learn about billing through Paddle and how to cancel your payment reminder software subscription.",
  path: "/refund",
});

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
