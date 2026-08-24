import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Mail, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-gray-900">GentleTap</span>
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
          <span>QuickBooks & FreshBooks Invoice Follow-Up</span>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          Get paid without <span className="text-blue-600">sounding pushy.</span>
        </h1>
        <p className="text-xl font-medium text-gray-800 max-w-2xl mx-auto mb-4">
          AI-powered invoice follow-up for freelancers and consultants.
        </p>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          GentleTap drafts warm-to-firm payment reminders in your voice, sends them from your Gmail, and stops automatically when QuickBooks or FreshBooks shows the invoice is paid.
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
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 GentleTap. Production-grade invoice follow-up SaaS.</p>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/blog" className="hover:text-blue-600">Blog</Link>
            <Link to="/compare" className="hover:text-blue-600">Compare</Link>
            <Link to="/alternatives" className="hover:text-blue-600">Alternatives</Link>
            <Link to="/industries" className="hover:text-blue-600">Industries</Link>
            <Link to="/features" className="hover:text-blue-600">Features</Link>
            <Link to="/affiliates" className="hover:text-blue-600">Affiliates</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};
