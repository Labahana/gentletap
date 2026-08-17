import React from 'react';
import { Sparkles, X, Check } from 'lucide-react';

interface UpgradeBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 fill-blue-600/20" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to GentleTap Pro</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          You've hit the <strong className="text-gray-900">3 invoice limit</strong> on the Free Plan. Upgrade today to unlock unlimited automated follow-ups and complete accounting sync.
        </p>

        <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-gray-100 text-sm">
          <div className="flex items-center space-x-2.5 text-gray-700">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Unlimited Invoices & Client Profiles</span>
          </div>
          <div className="flex items-center space-x-2.5 text-gray-700">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Live Sync with QuickBooks Online & FreshBooks</span>
          </div>
          <div className="flex items-center space-x-2.5 text-gray-700">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>AI-Powered Personalization (Warm, Firm & Urgent Tones)</span>
          </div>
          <div className="flex items-center space-x-2.5 text-gray-700">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Resend Webhook Delivery & Open Tracking</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              alert('Pro Subscription selected! Paddle integration will process your payment.');
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors text-sm text-center"
          >
            Upgrade for $19/mo
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
