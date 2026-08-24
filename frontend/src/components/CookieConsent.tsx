import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'gentletap_cookie_consent';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // storage unavailable — stay hidden
    }
  }, []);

  const choose = (value: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: new Date().toISOString() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={20} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">
            We use essential cookies to keep you signed in. No analytics or advertising cookies —
            see our{' '}
            <Link to="/cookies" className="text-blue-600 hover:text-blue-700 font-medium">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => choose('declined')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => choose('accepted')}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
