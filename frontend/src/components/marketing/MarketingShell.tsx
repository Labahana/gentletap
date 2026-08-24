import React from 'react';
import { Link } from 'react-router-dom';

type Crumb = { name: string; path?: string };

export const MarketingHeader: React.FC = () => (
  <header className="h-16 bg-white border-b border-gray-100 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40">
    <Link to="/" className="flex items-center space-x-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
        <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
      </div>
      <span className="text-xl font-bold text-gray-900">GentleTap</span>
    </Link>
    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-600">
      <Link to="/features" className="hover:text-blue-600">Features</Link>
      <Link to="/industries" className="hover:text-blue-600">Industries</Link>
      <Link to="/compare" className="hover:text-blue-600">Compare</Link>
      <Link to="/alternatives" className="hover:text-blue-600">Alternatives</Link>
      <Link to="/blog" className="hover:text-blue-600">Blog</Link>
      <Link to="/affiliates" className="hover:text-blue-600">Affiliates</Link>
    </nav>
    <div className="flex items-center space-x-3">
      <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600">
        Log in
      </Link>
      <Link
        to="/signup"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        Start free
      </Link>
    </div>
  </header>
);

export const MarketingFooter: React.FC = () => (
  <footer className="bg-white border-t border-gray-100 mt-auto">
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
      <div>
        <p className="font-semibold text-gray-900 mb-3">Product</p>
        <ul className="space-y-2 text-gray-600">
          <li><Link to="/features" className="hover:text-blue-600">Features</Link></li>
          <li><Link to="/quickbooks-payment-reminders" className="hover:text-blue-600">QuickBooks reminders</Link></li>
          <li><Link to="/freshbooks-invoice-reminders" className="hover:text-blue-600">FreshBooks reminders</Link></li>
          <li><Link to="/xero-invoice-reminders" className="hover:text-blue-600">Xero (waitlist)</Link></li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-gray-900 mb-3">Resources</p>
        <ul className="space-y-2 text-gray-600">
          <li><Link to="/blog" className="hover:text-blue-600">Blog</Link></li>
          <li><Link to="/invoice-follow-up-email-templates-for-freelancers" className="hover:text-blue-600">Email templates</Link></li>
          <li><Link to="/how-to-follow-up-on-overdue-invoices" className="hover:text-blue-600">How-to guide</Link></li>
          <li><Link to="/affiliates" className="hover:text-blue-600">Affiliate program</Link></li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-gray-900 mb-3">Compare</p>
        <ul className="space-y-2 text-gray-600">
          <li><Link to="/compare" className="hover:text-blue-600">All comparisons</Link></li>
          <li><Link to="/alternatives" className="hover:text-blue-600">Alternatives</Link></li>
          <li><Link to="/industries" className="hover:text-blue-600">By industry</Link></li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-gray-900 mb-3">Legal</p>
        <ul className="space-y-2 text-gray-600">
          <li><Link to="/privacy" className="hover:text-blue-600">Privacy</Link></li>
          <li><Link to="/terms" className="hover:text-blue-600">Terms</Link></li>
          <li><Link to="/cookies" className="hover:text-blue-600">Cookies</Link></li>
          <li><Link to="/refund" className="hover:text-blue-600">Refunds</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
      &copy; {new Date().getFullYear()} GentleTap. All rights reserved.
    </div>
  </footer>
);

export const MarketingShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <MarketingHeader />
    <main className="flex-1">{children}</main>
    <MarketingFooter />
  </div>
);

export const Breadcrumbs: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
    <ol className="flex flex-wrap items-center gap-1.5">
      {items.map((c, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {c.path ? (
            <Link to={c.path} className="hover:text-blue-600">{c.name}</Link>
          ) : (
            <span className="text-gray-700">{c.name}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
