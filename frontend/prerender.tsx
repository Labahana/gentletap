/**
 * Build-time head-only prerender entry.
 *
 * Renders each public route through react-dom/server + react-helmet-async's SSR context
 * to capture that page's REAL <head> (title, description, canonical, robots, og:/twitter:,
 * JSON-LD) straight from the page component's own <Seo> call — zero meta drift.
 *
 * Only the public/indexable pages are imported here (not the full AppRoutes): the
 * authenticated pages pull in billing/Paddle and chart libs we don't want to evaluate in
 * Node. scripts/prerender.mjs drives this with SITEMAP_PATHS, then splices the captured
 * tags into the built dist/<path>/index.html between the SEO_HEAD markers; body + hashed
 * asset refs stay identical, so the SPA hydrates exactly as before. No SSR migration, no
 * nginx change. A path whose page fails to render is left on the shell (no regression).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
// .mjs: this react-router-dom build has no `exports` map, so the extensionless
// subpath isn't Node-resolvable; the esm file is, and packages:external leaves it bare.
import { StaticRouter } from 'react-router-dom/server.mjs';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPage } from '@/pages/legal/Privacy';
import { TermsPage } from '@/pages/legal/Terms';
import { CookiesPage } from '@/pages/legal/Cookies';
import { RefundPage } from '@/pages/legal/Refund';
import { Unsubscribe } from '@/pages/Unsubscribe';
import { QuickbooksIntegration } from '@/pages/marketing/QuickbooksIntegration';
import { FreshbooksIntegration } from '@/pages/marketing/FreshbooksIntegration';
import { FreelancerTemplates } from '@/pages/marketing/FreelancerTemplates';
import { XeroWaitlist } from '@/pages/marketing/XeroWaitlist';
import { BlogIndex } from '@/pages/marketing/BlogIndex';
import { BlogPostPage } from '@/pages/marketing/BlogPostPage';
import { CompareIndex } from '@/pages/marketing/CompareIndex';
import { CompareDetail } from '@/pages/marketing/CompareDetail';
import { IndustriesIndex } from '@/pages/marketing/IndustriesIndex';
import { IndustryDetail } from '@/pages/marketing/IndustryDetail';
import { FeaturesIndex } from '@/pages/marketing/FeaturesIndex';
import { FeatureDetail } from '@/pages/marketing/FeatureDetail';
import { AlternativesIndex } from '@/pages/marketing/AlternativesIndex';
import { QuickbooksInvoiceAutomation } from '@/pages/marketing/QuickbooksInvoiceAutomation';
import { QuickbooksVsGentletap } from '@/pages/marketing/QuickbooksVsGentletap';
import { HowToFollowUp } from '@/pages/marketing/HowToFollowUp';
import { InvoiceFollowUpGuide } from '@/pages/marketing/InvoiceFollowUpGuide';
import { AffiliateLanding } from '@/pages/affiliates/AffiliateLanding';
import { AffiliateTerms } from '@/pages/affiliates/AffiliateTerms';
import { SITEMAP_PATHS } from '@/data/seo';

export { SITEMAP_PATHS };

const PublicRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/cookies" element={<CookiesPage />} />
    <Route path="/refund" element={<RefundPage />} />
    <Route path="/unsubscribe" element={<Unsubscribe />} />
    <Route path="/quickbooks-payment-reminders" element={<QuickbooksIntegration />} />
    <Route path="/freshbooks-invoice-reminders" element={<FreshbooksIntegration />} />
    <Route path="/invoice-follow-up-email-templates-for-freelancers" element={<FreelancerTemplates />} />
    <Route path="/xero-invoice-reminders" element={<XeroWaitlist />} />
    <Route path="/quickbooks-invoice-automation" element={<QuickbooksInvoiceAutomation />} />
    <Route path="/quickbooks-reminders-vs-gentletap" element={<QuickbooksVsGentletap />} />
    <Route path="/how-to-follow-up-on-overdue-invoices" element={<HowToFollowUp />} />
    <Route path="/invoice-follow-up-guide" element={<InvoiceFollowUpGuide />} />
    <Route path="/blog" element={<BlogIndex />} />
    <Route path="/blog/:slug" element={<BlogPostPage />} />
    <Route path="/compare" element={<CompareIndex />} />
    <Route path="/compare/:slug" element={<CompareDetail />} />
    <Route path="/industries" element={<IndustriesIndex />} />
    <Route path="/industries/:slug" element={<IndustryDetail />} />
    <Route path="/features" element={<FeaturesIndex />} />
    <Route path="/features/:slug" element={<FeatureDetail />} />
    <Route path="/alternatives" element={<AlternativesIndex />} />
    <Route path="/affiliates" element={<AffiliateLanding />} />
    <Route path="/affiliates/terms" element={<AffiliateTerms />} />
  </Routes>
);

/** Render `path` and return the helmet-managed head tags, or null on any failure. */
export function renderHeadTags(path: string): string | null {
  try {
    const context: Record<string, unknown> = {};
    const queryClient = new QueryClient();
    renderToString(
      React.createElement(
        HelmetProvider,
        { context },
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(StaticRouter, { location: path }, React.createElement(PublicRoutes)),
        ),
      ),
    );
    const helmet = context.helmet as Record<string, { toString(): string }>;
    const parts = [helmet.title, helmet.meta, helmet.link, helmet.script, helmet.noscript]
      .map((piece) => (piece ? piece.toString().trim() : ''))
      .filter(Boolean);
    const out = parts.join('\n    ');
    return out.length > 0 ? out : null;
  } catch (err) {
    console.warn(`[prerender] skipped ${path}: ${(err as Error).message}`);
    return null;
  }
}
