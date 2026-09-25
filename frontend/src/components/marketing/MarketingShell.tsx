import React from 'react';
import { Link } from 'react-router-dom';

type Crumb = { name: string; path?: string };

export const MarketingHeader: React.FC = () => (
  <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40">
    <Link to="/" className="flex items-center space-x-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
        <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900">
        Gentle<span className="text-brand-600">Tap</span>
      </span>
    </Link>
    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
      <Link to="/features" className="hover:text-brand-600">Features</Link>
      <Link to="/industries" className="hover:text-brand-600">Industries</Link>
      <Link to="/compare" className="hover:text-brand-600">Compare</Link>
      <Link to="/alternatives" className="hover:text-brand-600">Alternatives</Link>
      <Link to="/blog" className="hover:text-brand-600">Blog</Link>
      <Link to="/affiliates" className="hover:text-brand-600">Affiliates</Link>
    </nav>
    <div className="flex items-center space-x-3">
      <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-brand-600">
        Log in
      </Link>
      <Link
        to="/signup"
        className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Start free
      </Link>
    </div>
  </header>
);

const FOOTER_COLUMNS: Array<{ title: string; links: Array<{ name: string; to: string }> }> = [
  {
    title: 'Product',
    links: [
      { name: 'Features', to: '/features' },
      { name: 'QuickBooks reminders', to: '/quickbooks-payment-reminders' },
      { name: 'FreshBooks reminders', to: '/freshbooks-invoice-reminders' },
      { name: 'Xero (waitlist)', to: '/xero-invoice-reminders' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Blog', to: '/blog' },
      { name: 'Email templates', to: '/invoice-follow-up-email-templates-for-freelancers' },
      { name: 'How-to guide', to: '/how-to-follow-up-on-overdue-invoices' },
      { name: 'Pricing', to: '/' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { name: 'All comparisons', to: '/compare' },
      { name: 'Alternatives', to: '/alternatives' },
      { name: 'By industry', to: '/industries' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { name: 'Affiliate program', to: '/affiliates' },
      { name: 'Partner login', to: '/affiliates/login' },
      { name: 'Affiliate terms', to: '/affiliates/terms' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy', to: '/privacy' },
      { name: 'Terms', to: '/terms' },
      { name: 'Cookies', to: '/cookies' },
      { name: 'Refunds', to: '/refund' },
    ],
  },
];

export const MarketingFooter: React.FC = () => (
  <footer className="bg-white border-t border-slate-200 mt-auto">
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
      {FOOTER_COLUMNS.map((col) => (
        <div key={col.title}>
          <p className="font-semibold text-slate-900 mb-3">{col.title}</p>
          <ul className="space-y-2 text-slate-600">
            {col.links.map((link) => (
              <li key={link.name}>
                <Link to={link.to} className="hover:text-brand-600">{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-600">
      &copy; {new Date().getFullYear()} GentleTap. All rights reserved.
    </div>
  </footer>
);

export const MarketingShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col font-display text-slate-900">
    <MarketingHeader />
    <main className="flex-1">{children}</main>
    <MarketingFooter />
  </div>
);

export const Breadcrumbs: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-sm text-slate-600 mb-6">
    <ol className="flex flex-wrap items-center gap-1.5">
      {items.map((c, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {c.path ? (
            <Link to={c.path} className="hover:text-brand-600">{c.name}</Link>
          ) : (
            <span className="text-slate-900">{c.name}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
