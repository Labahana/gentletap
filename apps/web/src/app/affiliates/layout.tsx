import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_REFERRAL_DISCOUNT_MONTHS,
  AFFILIATE_REFERRAL_DISCOUNT_PERCENT,
  referralDiscountLabel,
} from "@/lib/affiliate-program";
import { AFFILIATE_FAQ } from "@/lib/seo-content";
import {
  affiliateProgramJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const COMMISSION_PERCENT = Math.round(AFFILIATE_COMMISSION_RATE * 100);
const TITLE = `Affiliate Program — ${COMMISSION_PERCENT}% Recurring for ${AFFILIATE_COMMISSION_MONTHS} Months`;
const DESCRIPTION =
  `Join the GentleTap affiliate program for YouTube creators and freelance educators. Earn ${COMMISSION_PERCENT}% recurring commission for ${AFFILIATE_COMMISSION_MONTHS} months. Referred customers get ${referralDiscountLabel()} on QuickBooks invoice reminder software.`;

const HOW_TO_STEPS = [
  {
    name: "Apply to the program",
    text: "Submit your channel details at gentletap.co/affiliates. We approve creators whose audience includes QuickBooks freelancers.",
  },
  {
    name: "Share your referral link",
    text: "Use gentletap.co/?ref=yourcode in videos, newsletters, and posts. Mention the 20% audience discount to improve conversions.",
  },
  {
    name: "Track signups and earnings",
    text: "Log into the affiliate dashboard to see clicks, referred signups, active subscribers, and commission balances.",
  },
  {
    name: "Earn recurring commission",
    text: "Receive 30% of each subscription payment for 24 months per referred customer, paid monthly via PayPal.",
  },
] as const;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/affiliates",
  ogTitle: `GentleTap Affiliate Program — ${COMMISSION_PERCENT}% + Audience Discount`,
  keywords: [
    "GentleTap affiliate program",
    "SaaS affiliate program freelancers",
    "recurring commission payment reminder software",
    "QuickBooks affiliate program",
    "YouTube creator affiliate SaaS",
    "freelance business affiliate marketing",
    "invoice software affiliate commission",
    "30 percent recurring affiliate program",
    "best SaaS affiliate programs for creators",
    "payment reminder software affiliate",
    "accounts receivable software affiliate",
    "recurring affiliate commission 24 months",
    "affiliate program with audience discount",
    "promote QuickBooks invoice reminders",
  ],
});

export default function AffiliatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(TITLE, DESCRIPTION, "/affiliates"),
          affiliateProgramJsonLd(
            DESCRIPTION,
            AFFILIATE_COMMISSION_MONTHS,
            COMMISSION_PERCENT,
            AFFILIATE_REFERRAL_DISCOUNT_PERCENT,
            AFFILIATE_REFERRAL_DISCOUNT_MONTHS,
          ),
          organizationJsonLd(),
          faqJsonLd(AFFILIATE_FAQ),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Affiliate Program", path: "/affiliates" },
          ]),
          howToJsonLd(
            "How to become a GentleTap affiliate",
            "Apply, share your link with audience discount, and earn recurring commission.",
            HOW_TO_STEPS,
          ),
        ]}
      />
      {children}
    </>
  );
}
