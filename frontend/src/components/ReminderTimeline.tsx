import React from 'react';
import { describeStatus, describeHold, TONE_LABELS } from '@/lib/autopilot';

type ReminderRow = {
  id: string;
  step_index: number;
  scheduled_at: string;
  tone: string;
  status: string;
  draft_subject?: string | null;
  skip_reason?: string | null;
};

export type { ReminderRow };

interface Props {
  items: ReminderRow[];
  onEdit?: (item: ReminderRow) => void;
}

const toneColor: Record<string, string> = {
  warm: 'bg-amber-50 text-amber-700',
  friendly: 'bg-sky-50 text-sky-700',
  professional: 'bg-slate-100 text-slate-700',
  firm: 'bg-orange-50 text-orange-700',
  urgent: 'bg-rose-50 text-rose-700',
};

const statusColor: Record<string, string> = {
  done: 'text-emerald-600',
  pending: 'text-blue-600',
  held: 'text-amber-600',
  skipped: 'text-gray-400',
};

const dotColor: Record<string, string> = {
  done: 'bg-emerald-500',
  pending: 'bg-blue-500',
  held: 'bg-amber-500',
  skipped: 'bg-gray-300',
};

export const ReminderTimeline: React.FC<Props> = ({ items, onEdit }) => {
  if (!items?.length) {
    return (
      <p className="text-sm text-gray-500">
        No reminder schedule yet. Assign a sequence to get started.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-5">
      {items.map((item) => {
        const status = describeStatus(item.status);
        const hold = describeHold(item.skip_reason);
        const editable = status.tone === 'pending' || status.tone === 'held';
        return (
          <li key={item.id} className="ml-6">
            <span
              className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${dotColor[status.tone]}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                Step {item.step_index + 1} · {TONE_LABELS[item.tone] || item.tone}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                  toneColor[item.tone] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.tone}
              </span>
              <span className={`text-xs font-medium ${statusColor[status.tone]}`}>{status.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(item.scheduled_at).toLocaleString()}
              {item.draft_subject ? ` · ${item.draft_subject}` : ''}
            </p>
            {hold && <p className="text-xs text-amber-600 mt-0.5">{hold}</p>}
            {editable && onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {status.tone === 'held' ? 'Review' : 'Edit upcoming'}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
};
