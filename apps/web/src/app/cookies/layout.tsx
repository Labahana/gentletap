import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "GentleTap Cookie Policy — how we use essential and analytics cookies on our payment reminder software website.",
  path: "/cookies",
});

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
