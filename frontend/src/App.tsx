import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPage } from '@/pages/legal/Privacy';
import { TermsPage } from '@/pages/legal/Terms';
import { CookiesPage } from '@/pages/legal/Cookies';
import { RefundPage } from '@/pages/legal/Refund';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Invoices } from '@/pages/Invoices';
import { InvoiceDetail } from '@/pages/InvoiceDetail';
import { Clients } from '@/pages/Clients';
import { ClientDetail } from '@/pages/ClientDetail';
import { Sequences } from '@/pages/Sequences';
import { SequenceDetail } from '@/pages/SequenceDetail';
import { SendHistory } from '@/pages/SendHistory';
import { Payouts } from '@/pages/Payouts';
import { Templates } from '@/pages/Templates';
import { Settings } from '@/pages/Settings';
import { Integrations } from '@/pages/Integrations';
import { Escalations } from '@/pages/Escalations';
import { Unsubscribe } from '@/pages/Unsubscribe';
import { Billing } from '@/pages/Billing';
import { Team } from '@/pages/Team';
import { Onboarding } from '@/pages/Onboarding';
import { GoogleAuthCallback } from '@/pages/GoogleAuthCallback';
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
import { AffiliateLanding } from '@/pages/affiliates/AffiliateLanding';
import { AffiliateLogin } from '@/pages/affiliates/AffiliateLogin';
import { AffiliateDashboard } from '@/pages/affiliates/AffiliateDashboard';
import { AffiliateTerms } from '@/pages/affiliates/AffiliateTerms';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { CookieConsent } from '@/components/CookieConsent';
import { AffiliateRefTracker } from '@/components/AffiliateRefTracker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30_000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
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
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/quickbooks-payment-reminders" element={<QuickbooksIntegration />} />
            <Route path="/freshbooks-invoice-reminders" element={<FreshbooksIntegration />} />
            <Route path="/invoice-follow-up-email-templates-for-freelancers" element={<FreelancerTemplates />} />
            <Route path="/xero-invoice-reminders" element={<XeroWaitlist />} />
            <Route path="/quickbooks-invoice-automation" element={<QuickbooksInvoiceAutomation />} />
            <Route path="/quickbooks-reminders-vs-gentletap" element={<QuickbooksVsGentletap />} />
            <Route path="/how-to-follow-up-on-overdue-invoices" element={<HowToFollowUp />} />
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
            <Route path="/affiliates/login" element={<AffiliateLogin />} />
            <Route path="/affiliates/dashboard" element={<AffiliateDashboard />} />
            <Route path="/affiliates/terms" element={<AffiliateTerms />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/escalations" element={<Escalations />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/sequences" element={<Sequences />} />
              <Route path="/sequences/:id" element={<SequenceDetail />} />
              <Route path="/history" element={<SendHistory />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/integrations" element={<Integrations />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <AffiliateRefTracker />
          <CookieConsent />
        </BrowserRouter>
      </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
