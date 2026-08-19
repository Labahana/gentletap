import React from 'react';
import { Link } from 'react-router-dom';

const LEGAL_NAV = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/refund', label: 'Refund' },
];

export const LegalLayout: React.FC<{
  title: string;
  updated: string;
  children: React.ReactNode;
}> = ({ title, updated, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo192.png" alt="GentleTap" className="h-7 w-7 object-contain" />
            <span className="font-bold text-gray-900">GentleTap</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-600">
              Home
            </Link>
            {LEGAL_NAV.map((link) => (
              <Link key={link.href} to={link.href} className="hover:text-blue-600">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>
        <article className="mt-10 space-y-6 text-[15px] leading-relaxed text-slate-700 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_a]:text-blue-600 [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]">
          {children}
        </article>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-gray-400">
          © {new Date().getFullYear()} GentleTap. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
