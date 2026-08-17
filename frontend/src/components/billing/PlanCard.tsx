import React from 'react';

interface Props {
  name: string;
  price: number;
  period: 'monthly' | 'annual';
  features: string[];
  current?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
  cta?: string;
  loading?: boolean;
}

export const PlanCard: React.FC<Props> = ({
  name,
  price,
  period,
  features,
  current,
  highlighted,
  onSelect,
  cta = 'Choose plan',
  loading,
}) => (
  <div
    className={`rounded-xl border p-5 flex flex-col ${
      highlighted ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/40' : 'border-gray-200 bg-white'
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-bold text-gray-900">{name}</h3>
      {current && (
        <span className="text-[10px] font-semibold uppercase bg-gray-900 text-white px-2 py-0.5 rounded">
          Current
        </span>
      )}
    </div>
    <div className="mb-4">
      <span className="text-3xl font-extrabold text-gray-900">${price}</span>
      <span className="text-xs text-gray-500">/{period === 'annual' ? 'mo billed yearly' : 'mo'}</span>
    </div>
    <ul className="space-y-1.5 text-xs text-gray-600 flex-1 mb-4">
      {features.map((f) => (
        <li key={f}>• {f}</li>
      ))}
    </ul>
    <button
      disabled={current || loading}
      onClick={onSelect}
      className={`w-full text-xs font-semibold py-2.5 rounded-lg ${
        current
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {current ? 'Current plan' : loading ? 'Working…' : cta}
    </button>
  </div>
);
