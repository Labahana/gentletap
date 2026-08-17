import React from 'react';

export const ProgressBar: React.FC<{ step: number; total?: number }> = ({ step, total = 5 }) => (
  <div className="flex items-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex-1 flex items-center gap-2">
        <div
          className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
        />
      </div>
    ))}
    <span className="text-xs font-semibold text-gray-500 ml-2">
      {step}/{total}
    </span>
  </div>
);
