import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign up free — AI payment reminders for freelancers",
  description:
    "Create your GentleTap account in minutes. Connect QuickBooks Online, preview AI invoice follow-ups, and start automated payment reminders from your Gmail. No credit card required.",
  path: "/signup",
  keywords: [
    "GentleTap signup",
    "payment reminder software free trial",
    "QuickBooks payment reminders",
    "automated invoice follow up",
  ],
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
