import Link from "next/link";

import { LegalEntityBlock } from "@/components/legal-entity-block";
import { LegalLayout } from "@/components/legal-layout";
import { LEGAL, operatorIntro } from "@/lib/legal";
import { AFFILIATE_COMMISSION_MONTHS, referralDiscountLabel } from "@/lib/affiliate-program";

export default function AffiliateTermsPage() {
  return (
    <LegalLayout title="Affiliate Program Terms" updated="June 28, 2026">
      <p>
        These Affiliate Program Terms (&quot;Affiliate Terms&quot;) govern participation in the{" "}
        {LEGAL.productName} affiliate program (&quot;Program&quot;). By applying, logging into the
        affiliate dashboard, or sharing a referral link, you agree to these Affiliate Terms in
        addition to our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Who we are</h2>
      <p>{operatorIntro()}</p>
      <LegalEntityBlock />

      <h2>Program overview</h2>
      <p>
        The Program allows approved partners (&quot;Affiliates&quot;) to refer new customers to{" "}
        {LEGAL.productName} using a unique tracking link. When a referred customer subscribes to a
        paid plan, the Affiliate may earn recurring commission as described below.
      </p>
      <p>
        Participation is by application only. We may approve or reject any application at our sole
        discretion. We may pause or terminate any Affiliate account that violates these Affiliate
        Terms.
      </p>

      <h2>Commission structure</h2>
      <ul>
        <li>
          <strong>Rate:</strong> 30% of the net subscription amount we receive from each referred
          customer&apos;s recurring plan payment (before taxes and payment-processor fees, unless
          otherwise stated in your approval email).
        </li>
        <li>
          <strong>Duration:</strong> Commission applies to each successful subscription payment for{" "}
          <strong>{AFFILIATE_COMMISSION_MONTHS} months</strong> from the referred customer&apos;s
          first paid subscription. After that window, no further commission is owed on that
          customer, even if they remain subscribed.
        </li>
        <li>
          <strong>Recurring (within window):</strong> Each renewal payment during those{" "}
          {AFFILIATE_COMMISSION_MONTHS} months earns commission, while the referred customer
          maintains an active paid plan and the Affiliate remains in good standing.
        </li>
        <li>
          <strong>Eligible plans:</strong> Paid subscription plans offered on {LEGAL.websiteDisplay}{" "}
          at the time of payment (e.g. Pro, Pro+, Team). One-time add-ons (such as WhatsApp credit
          packs) are excluded unless we explicitly include them in writing.
        </li>
        <li>
          <strong>Changes:</strong> We may change commission rates for <em>new</em> referrals with
          30 days&apos; notice. Rates for existing active referrals remain as agreed unless the
          Affiliate Terms are terminated.
        </li>
      </ul>

      <h2>Audience discount for referred customers</h2>
      <p>
        To help Affiliates convert their audience, we may offer a promotional discount to customers
        who sign up through a valid affiliate referral link and upgrade to a paid plan. As of these
        Affiliate Terms, referred customers receive <strong>{referralDiscountLabel()}</strong> on
        eligible paid subscriptions (Pro, Pro+, Team), applied automatically at checkout when
        configured in our billing system.
      </p>
      <ul>
        <li>
          The audience discount is a marketing benefit for referred customers — it does not reduce
          your commission eligibility. Commission is calculated on the net subscription amount we
          receive after the discount.
        </li>
        <li>
          We may change or discontinue the audience discount with reasonable notice. Affiliates
          should not promise discounts beyond what is stated on {LEGAL.websiteDisplay}/affiliates
          or in your affiliate dashboard.
        </li>
        <li>
          Coupon and deal sites may not republish the audience discount without our written approval
          (see prohibited promotion below).
        </li>
      </ul>

      <h2>Referral tracking</h2>
      <ul>
        <li>
          Affiliates receive a unique referral code and link (e.g.{" "}
          <code>{LEGAL.websiteDisplay}/signup?ref=yourcode</code>).
        </li>
        <li>
          <strong>Attribution window:</strong> 30 days from the first click on your referral link.
          If a visitor signs up within that window, the referral is attributed to you.
        </li>
        <li>
          <strong>Last-click wins:</strong> If a visitor uses multiple affiliate links, the most
          recent valid referral before signup is credited.
        </li>
        <li>
          Self-referrals are not permitted. You may not create accounts to earn commission on your
          own subscriptions.
        </li>
        <li>
          We use cookies and server-side records to track clicks, signups, and conversions. See our{" "}
          <Link href="/cookies">Cookie Policy</Link> for more information.
        </li>
      </ul>

      <h2>Payouts</h2>
      <ul>
        <li>
          <strong>Method:</strong> PayPal to the payout email address on your affiliate account,
          unless we agree otherwise in writing.
        </li>
        <li>
          <strong>Schedule:</strong> Payouts are processed monthly, net 30 days after the end of each
          calendar month, for all commissions marked as payable in our system.
        </li>
        <li>
          <strong>Minimum balance:</strong> $50 USD (or equivalent). Amounts below the minimum roll
          forward to the next payout period.
        </li>
        <li>
          <strong>Taxes:</strong> You are responsible for all taxes on commission income. We may
          request tax information (e.g. W-9 for US partners) before issuing payouts above applicable
          thresholds.
        </li>
        <li>
          Commission amounts shown in the affiliate dashboard are estimates for tracking purposes.
          Final payable amounts are determined by us after validating Paddle payment records.
        </li>
      </ul>

      <h2>Refunds, chargebacks, and clawbacks</h2>
      <p>
        If a referred customer receives a refund, chargeback, or payment reversal, the related
        commission (and any renewals tied to that invalid payment) will be deducted from your
        balance. If your balance is insufficient, we may offset future commissions or request
        repayment.
      </p>
      <p>
        Commission ends when either the {AFFILIATE_COMMISSION_MONTHS}-month window expires, the
        referred customer cancels their paid subscription, or downgrades to a free plan.
      </p>

      <h2>How you may promote GentleTap</h2>
      <p>You agree to promote {LEGAL.productName} honestly and in compliance with applicable law.</p>
      <p>
        <strong>Allowed:</strong> YouTube videos, blog posts, newsletters, social posts, podcasts,
        and direct recommendations to your audience — provided you disclose your affiliate
        relationship (e.g. &quot;I earn a commission if you sign up through my link&quot;).
      </p>
      <p>
        <strong>Prohibited:</strong>
      </p>
      <ul>
        <li>Spam, unsolicited bulk email, or misleading ads</li>
        <li>Bidding on {LEGAL.productName} branded keywords (e.g. &quot;GentleTap&quot;) in paid search</li>
        <li>Cookie stuffing, fake clicks, or incentivized signups that misrepresent the product</li>
        <li>Claims we do not support (e.g. guaranteed payment collection, legal debt collection)</li>
        <li>Impersonating {LEGAL.productName} or suggesting you are an employee or official partner</li>
        <li>Promoting on coupon/discount sites without our written approval</li>
      </ul>

      <h2>Brand assets</h2>
      <p>
        You may use our name, logo, and product screenshots solely to promote the service under these
        Affiliate Terms. We may revoke this permission at any time. Do not modify our logo or imply
        endorsement beyond the affiliate relationship.
      </p>

      <h2>Dashboard and data</h2>
      <p>
        Approved Affiliates can access a dashboard showing clicks, signups, active referrals, and
        commission history. Referred customer emails are partially masked for privacy. You must keep
        your affiliate login credentials secure.
      </p>

      <h2>Term and termination</h2>
      <ul>
        <li>Either party may terminate participation at any time with written notice.</li>
        <li>
          We may terminate immediately for violation of these Affiliate Terms, fraud, or conduct
          that harms {LEGAL.productName}&apos;s reputation.
        </li>
        <li>
          Upon termination, you must stop using referral links. Commissions earned on valid referrals
          before termination remain payable subject to these Affiliate Terms, unless termination was
          for fraud or policy violation.
        </li>
      </ul>

      <h2>Limitation of liability</h2>
      <p>
        The Program is provided &quot;as is.&quot; We do not guarantee any level of earnings, traffic,
        or conversions. Our total liability related to the Program is limited to unpaid commissions
        actually earned and verified under these Affiliate Terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Affiliate Terms from time to time. Material changes will be posted on
        this page with an updated date. Continued participation after changes constitutes acceptance.
      </p>

      <h2>Governing law</h2>
      <p>
        These Affiliate Terms are governed by the laws of the {LEGAL.governingLaw}, without regard
        to conflict-of-law principles, consistent with our main Terms of Service.
      </p>

      <h2>Contact</h2>
      <p>
        Affiliate program questions:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        <br />
        Legal inquiries: <a href={`mailto:${LEGAL.legalEmail}`}>{LEGAL.legalEmail}</a>
      </p>
      <p>
        <Link href="/affiliates">← Back to affiliate program</Link>
      </p>
    </LegalLayout>
  );
}
