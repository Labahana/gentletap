import React from 'react';

interface Props {
  annual: boolean;
  onChange: (annual: boolean) => void;
}

export const PricingToggle: React.FC<Props> = ({ annual, onChange }) => (
  <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 text-xs font-semibold">
    <button
      onClick={() => onChange(false)}
      className={`px-3 py-1.5 rounded-md ${!annual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
    >
      Monthly
    </button>
    <button
      onClick={() => onChange(true)}
      className={`px-3 py-1.5 rounded-md ${annual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
    >
      Annual <span className="text-emerald-600 ml-1">Save ~17%</span>
    </button>
  </div>
);
