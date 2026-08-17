import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Mail, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Zap className="w-5 h-5 fill-white text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-blue-600 tracking-tight">GentleTap</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-2">
            Sign In
          </Link>
          <Link
            to="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-xs transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-blue-100">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automated Invoice Follow-Up for Freelancers & Agencies</span>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          Get Paid Faster with <span className="text-blue-600">Warm & Professional</span> Reminders
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          GentleTap connects directly to QuickBooks, FreshBooks, or CSVs to automatically check overdues and send friendly, human-sounding reminder emails before payments get awkward.
        </p>

        <div className="flex items-center justify-center space-x-4 mb-16">
          <Link
            to="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center space-x-2 text-base"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3.5 rounded-xl transition-all text-base"
          >
            View Demo Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <ShieldCheck className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">InvoiceChaser Parity</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Full manual send, audit logs, template customization, and sequence assignment built for maximum control.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <Zap className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Live Accounting Sync</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Seamlessly pull invoices and customer records from QuickBooks Online, FreshBooks, or CSV import.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <Mail className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered Tone</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Kimi AI generates perfectly calibrated warm, friendly, or firm follow-up drafts in seconds.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500">
        © 2026 GentleTap. Production-grade invoice follow-up SaaS.
      </footer>
    </div>
  );
};
