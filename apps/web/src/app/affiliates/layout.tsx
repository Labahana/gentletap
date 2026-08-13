import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_FIRST_MONTH_RATE,
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
const FIRST_MONTH_PERCENT = Math.round(AFFILIATE_FIRST_MONTH_RATE * 100);
const TITLE = `Affiliate Program — ${FIRST_MONTH_PERCENT}% First Month + ${COMMISSION_PERCENT}% Recurring for ${AFFILIATE_COMMISSION_MONTHS} Months`;
const DESCRIPTION =
  `Join the GentleTap affiliate program for YouTube creators, educators, and bookkeepers. Earn ${FIRST_MONTH_PERCENT}% of each referral's first month plus ${COMMISSION_PERCENT}% recurring for ${AFFILIATE_COMMISSION_MONTHS} months, with 60-day cookies and $20 payouts. Referred customers get ${referralDiscountLabel()} on QuickBooks invoice reminder software.`;

const HOW_TO_STEPS = [
  {
    name: "Apply to the program",
    text: "Submit your channel details at gentletap.co/affiliates. We approve creators and accountants whose audience includes QuickBooks freelancers.",
  },
  {
    name: "Share your referral link",
    text: "Use gentletap.co/?ref=yourcode in videos, newsletters, and posts. Mention the 20% audience discount to improve conversions.",
  },
  {
    name: "Track signups and earnings",
    text: "Log into the affiliate dashboard to see clicks, referred signups, active subscribers, your commission tier, and balances.",
  },
  {
    name: "Earn the first-month bounty plus recurring commission",
    text: "Receive 50% of each referral's first payment plus 30% of every renewal for 24 months — up to 40% at volume — paid via PayPal, Wise, or bank transfer.",
  },
] as const;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/affiliates",
  ogTitle: `GentleTap Affiliate Program — ${FIRST_MONTH_PERCENT}% First Month + ${COMMISSION_PERCENT}% Recurring`,
  keywords: [
    "GentleTap affiliate program",
    "SaaS affiliate program freelancers",
    "recurring commission payment reminder software",
    "QuickBooks affiliate program",
    "YouTube creator affiliate SaaS",
    "freelance business affiliate marketing",
    "invoice software affiliate commission",
    "first month bounty affiliate program",
    "best SaaS affiliate programs for creators",
    "payment reminder software affiliate",
    "accounts receivable software affiliate",
    "recurring affiliate commission 24 months",
    "affiliate program with audience discount",
    "bookkeeper affiliate program",
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
