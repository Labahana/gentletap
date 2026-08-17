import React from 'react';
import { Mail, Sparkles, Copy, Edit2, Trash2 } from 'lucide-react';

interface TemplateCardProps {
  id: string;
  name: string;
  tone: string;
  subject: string;
  body: string;
  isDefault?: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  name,
  tone,
  subject,
  body,
  isDefault,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const getToneBadge = (t: string) => {
    switch (t.toLowerCase()) {
      case 'warm':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'friendly':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'professional':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'firm':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-900 text-base">{name}</span>
            {isDefault && (
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${getToneBadge(tone)}`}>
            {tone}
          </span>
        </div>

        <div className="bg-slate-50 border border-gray-100 rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Subject:</div>
          <div className="text-sm font-medium text-gray-800 line-clamp-1 mb-2">{subject}</div>
          <div className="text-xs font-semibold text-gray-500 mb-1">Body Preview:</div>
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed whitespace-pre-line">{body}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
        <button
          onClick={onPreview}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Preview Draft</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
              alert('Template copied to clipboard!');
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title="Copy Template"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title="Edit Template"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="Delete Template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
