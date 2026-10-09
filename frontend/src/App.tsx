import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes';
import { CookieConsent } from '@/components/CookieConsent';
import { AffiliateRefTracker } from '@/components/AffiliateRefTracker';
import { ChatWidget } from '@/components/ChatWidget';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <AffiliateRefTracker />
          <ChatWidget />
          <CookieConsent />
        </BrowserRouter>
      </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
