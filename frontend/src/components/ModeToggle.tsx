import React from 'react';

interface Props {
  mode: 'template' | 'autopilot';
  onChange: (mode: 'template' | 'autopilot') => void;
  saving?: boolean;
}

export const ModeToggle: React.FC<Props> = ({ mode, onChange, saving }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        disabled={saving}
        onClick={() => onChange('template')}
        className={`text-left p-4 rounded-xl border transition-colors ${
          mode === 'template'
            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="text-sm font-bold text-gray-900 mb-1">Template Mode</div>
        <p className="text-xs text-gray-600 leading-relaxed">
          AI drafts templates per tone. You review, save, build sequences, and assign them to invoices.
        </p>
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => onChange('autopilot')}
        className={`text-left p-4 rounded-xl border transition-colors ${
          mode === 'autopilot'
            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="text-sm font-bold text-gray-900 mb-1">Autopilot Mode</div>
        <p className="text-xs text-gray-600 leading-relaxed">
          AI generates templates and a default sequence, then auto-assigns new unpaid invoices. Full override anytime.
        </p>
      </button>
    </div>
  );
};
