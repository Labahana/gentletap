import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 rounded-xl shadow-xs my-6">
      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-lg font-bold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
