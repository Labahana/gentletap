import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export const FreshbooksIntegration: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>FreshBooks Invoice Reminders for Freelancers | GentleTap</title>
        <meta name="description" content="Stop chasing clients. GentleTap integrates with FreshBooks to automatically follow up on unpaid invoices using polite, human-sounding emails." />
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
            FreshBooks Invoice Follow-Up Built for Freelancers
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get paid faster without sacrificing the client relationship. GentleTap connects to FreshBooks and sends personalized, friendly reminders from your own Gmail account.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-md transition-all text-lg"
          >
            <span>Connect FreshBooks</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why FreshBooks alone isn't enough</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            FreshBooks is incredible for creating invoices, but its automated reminder system is limited. It only allows a few rigid, automated messages that sound like they were sent by a robot. As a freelancer, your relationship with your client is everything, and robotic emails can hurt that connection.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-6 mt-12">The GentleTap Advantage</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>True personalization:</strong> Instead of generic templates, GentleTap uses AI to draft follow-ups that sound like you actually sat down to type them.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>Sent from your inbox:</strong> We use Gmail OAuth to send the emails directly from your real email address, so clients hit reply and talk straight to you.
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <strong>Set and forget:</strong> It syncs your invoices live. When an invoice is paid via FreshBooks, the reminder sequence stops instantly. No accidental awkward emails.
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
