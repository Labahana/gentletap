import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export const QuickbooksIntegration: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Automated QuickBooks Invoice Reminders | GentleTap</title>
        <meta name="description" content="Automate QuickBooks invoice chasing in 5 minutes. GentleTap connects to QBO to send warm payment reminders from your Gmail and stops when paid." />
      </Helmet>

      {/* Navbar (Simplified) */}
      <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-gray-900">GentleTap</span>
        </Link>
        <Link
          to="/signup"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          Start Free Trial
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Automate Invoice Chasing in QuickBooks in 5 Minutes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Stop manually checking QBO to see who has paid. GentleTap automatically follows up on overdue invoices using warm, AI-drafted emails sent directly from your Gmail.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-md transition-all text-lg"
          >
            <span>Connect QuickBooks</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">The problem with QuickBooks native reminders</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            QuickBooks Online (QBO) has a built-in reminder feature, but it's very basic. It sends robotic, templated emails from a generic QuickBooks server address, which can damage client relationships or end up in spam. It also doesn't allow for dynamic tone changes (e.g., warm for 3 days late, firm for 30 days late).
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-6 mt-12">How GentleTap is different</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>Sent from your Gmail:</strong> Reminders come from your actual email address, preserving the human connection.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>AI-calibrated tone:</strong> Kimi AI drafts the emails so they sound friendly, not like a collection agency.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>Auto-stop on payment:</strong> Because we sync with QBO, the moment an invoice is marked paid in QuickBooks, the follow-ups stop immediately.
              </div>
            </li>
          </ul>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500">
        © 2026 GentleTap.
      </footer>
    </div>
  );
};
