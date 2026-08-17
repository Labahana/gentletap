import React from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onBuy: () => void;
  loading?: boolean;
}

export const CreditPackModal: React.FC<Props> = ({ open, onClose, onBuy, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Buy WhatsApp Credits</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Add 500 WhatsApp messages for $15. Credits are used after your monthly quota is exhausted.
        </p>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-bold text-gray-900">500 messages</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">$15</div>
        </div>
        <button
          onClick={onBuy}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg"
        >
          {loading ? 'Processing…' : 'Purchase pack'}
        </button>
      </div>
    </div>
  );
};
