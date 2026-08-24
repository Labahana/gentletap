import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';

const UPDATED = 'August 24, 2026';

export const AffiliateTerms: React.FC = () => (
  <MarketingShell>
    <Seo
      title="Affiliate Program Terms"
      description="Terms governing participation in the GentleTap affiliate program: commissions, tracking, payouts, and prohibited conduct."
      path="/affiliates/terms"
    />
    <article className="max-w-3xl mx-auto px-6 py-14 w-full">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Affiliate Program Terms</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <p>
          These Affiliate Program Terms ("Affiliate Terms") govern participation in the GentleTap
          affiliate program ("Program"). By applying, logging into the affiliate dashboard, or sharing a
          referral link, you agree to these Affiliate Terms in addition to our{' '}
          <Link to="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link> and{' '}
          <Link to="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>.
        </p>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Program overview</h2>
          <p className="mb-3">
            The Program allows approved partners ("Affiliates") to refer new customers to GentleTap using
            a unique tracking link. When a referred customer subscribes to a paid plan, the Affiliate may
            earn recurring commission as described below.
          </p>
          <p>
            Participation is by application only. We may approve or reject any application at our sole
            discretion, and may pause or terminate any affiliate account that violates these Affiliate
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Commission structure</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>First-month bounty:</strong> 50% of the net subscription amount received from a referred customer's first paid plan payment.</li>
            <li><strong>Recurring rate:</strong> 30% of net subscription amounts after the first payment, within the commission window.</li>
            <li><strong>Performance tiers:</strong> renewal rate rises to 35% at $500 month-to-date referred revenue and 40% at $2,000, applied automatically and visible in your dashboard.</li>
            <li><strong>Duration:</strong> commission applies for 24 months from the referred customer's first paid subscription; no further commission is owed on that customer afterward.</li>
            <li><strong>Eligible plans:</strong> paid subscription plans offered at the time of payment. One-time add-ons are excluded unless explicitly included in writing.</li>
            <li><strong>Changes:</strong> rates may change for new referrals with 30 days' notice; existing active referrals keep their agreed rates.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Audience discount</h2>
          <p>
            Referred customers may receive a promotional discount on their first paid months when signing
            up through a valid affiliate link, applied automatically at checkout. Commission is calculated
            on the net amount we receive after any discount. Do not promise discounts beyond what is shown
            on gentletap.co/affiliates or in your dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Tracking &amp; attribution</h2>
          <p>
            Clicks and signups are tracked via your referral link and a cookie lasting up to 60 days. The
            last valid affiliate link before signup determines attribution. Self-referrals and referrals
            from accounts you control are ineligible.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Payouts</h2>
          <p>
            Commissions become payable once confirmed (past refund windows) and reach the $20 minimum.
            Payouts are issued monthly via PayPal, Wise, or bank transfer. Clawbacks apply for refunded
            transactions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Prohibited conduct</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Spam, unsolicited bulk messaging, or misleading advertising.</li>
            <li>Bidding on branded search terms ("GentleTap", variants) in paid ads.</li>
            <li>Coupon/deal site listings that misrepresent offers or pricing.</li>
            <li>Trademark infringement, impersonation, or falsely implying partnership beyond the affiliate relationship.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Termination</h2>
          <p>
            Either party may end participation at any time. Earned, non-clawed-back commissions on
            qualifying payments made before termination remain payable; no new commissions accrue after.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Questions about the Program? Contact us through the details on our{' '}
          <Link to="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link> page.
        </p>
      </div>
    </article>
  </MarketingShell>
);
