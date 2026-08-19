import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Copy, ArrowRight } from 'lucide-react';

export const FreelancerTemplates: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Invoice Follow-Up Email Templates for Freelancers | GentleTap</title>
        <meta name="description" content="Copy and paste these professional, warm email templates to ask for payment on overdue invoices without ruining your client relationships." />
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
          Automate These Templates
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Invoice Follow-Up Email Templates for Freelancers
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Following up on late payments is awkward. Use these battle-tested, copy-and-paste email templates to get paid without sounding pushy.
          </p>
        </div>

        {/* Content Section */}
        <div className="space-y-12">
          
          {/* Template 1 */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">1. The "Just Checking In" (3 Days Late)</h2>
            <p className="text-gray-600 mb-6">Keep it very friendly. Assume they just missed it or forgot to hit send.</p>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 font-mono text-sm relative group">
              <p>Subject: Checking in on Invoice #1024</p>
              <br/>
              <p>Hi [Client Name],</p>
              <br/>
              <p>Hope you're having a great week!</p>
              <br/>
              <p>I'm just sending a quick note to check on Invoice #1024 for [Project Name]. It was due on [Due Date], but I know how easy it is for things to slip through the cracks.</p>
              <br/>
              <p>Could you let me know when you expect to process this?</p>
              <br/>
              <p>Thanks,<br/>[Your Name]</p>
            </div>
          </div>

          {/* Template 2 */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">2. The "Firm but Professional" (14 Days Late)</h2>
            <p className="text-gray-600 mb-6">Remove some of the pleasantries. Ask for a specific update.</p>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 font-mono text-sm relative group">
              <p>Subject: Overdue: Invoice #1024 for [Project Name]</p>
              <br/>
              <p>Hi [Client Name],</p>
              <br/>
              <p>I wanted to follow up again on Invoice #1024, which is now two weeks overdue. I've attached a copy of the original invoice for your reference.</p>
              <br/>
              <p>Can you please confirm the status of this payment and when I can expect to receive it?</p>
              <br/>
              <p>Best regards,<br/>[Your Name]</p>
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Tired of sending these manually?</h3>
            <p className="text-gray-700 mb-6 max-w-xl mx-auto">
              GentleTap connects to QuickBooks and FreshBooks to automatically draft and send these exact emails from your Gmail account. It stops the moment they pay.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all"
            >
              <span>Try GentleTap for Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500">
        © 2026 GentleTap.
      </footer>
    </div>
  );
};
