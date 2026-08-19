import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const XeroWaitlist: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In a real app, send this to an API or mailing list
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Xero Invoice Reminders | GentleTap</title>
        <meta name="description" content="GentleTap doesn't support Xero yet. Join the waitlist for AI-powered Xero invoice chasing, or learn about Xero's built-in options." />
      </Helmet>

      {/* Navbar */}
      <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-gray-900">GentleTap</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-6">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            GentleTap doesn't support Xero yet.
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            We're currently focusing on perfecting our QuickBooks and FreshBooks integrations. But Xero is next on our roadmap!
          </p>

          {!submitted ? (
            <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-gray-900 mb-2">Get notified when Xero goes live</h3>
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Join Waitlist
                </button>
              </form>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-green-50 p-6 rounded-xl border border-green-200 flex items-center justify-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">You're on the list! We'll be in touch.</span>
            </div>
          )}
        </div>

        {/* Current alternatives section */}
        <div className="mt-12 text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What can you do right now?</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">1. Use Xero's built-in reminders</h3>
              <p className="text-gray-600">
                Xero offers a basic invoice reminder feature. Go to Settings {'>'} Invoice Settings {'>'} Invoice Reminders. You can set up to 5 standard reminder emails to go out automatically based on the due date.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">2. Use GentleTap's CSV Import</h3>
              <p className="text-gray-600">
                You can export your overdue invoices from Xero as a CSV and upload them directly into GentleTap. This allows you to use our AI drafts and Gmail sending, though it lacks the real-time "auto-stop on payment" sync that our direct integrations provide.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500">
        © 2026 GentleTap.
      </footer>
    </div>
  );
};
