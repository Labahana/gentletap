import React from 'react';
import { Clock, Mail, CheckCircle2, ChevronRight } from 'lucide-react';

interface Step {
  day_offset: int;
  tone: string;
  template_id?: string;
  enabled?: boolean;
}

interface SequenceTimelineProps {
  steps: Step[];
}

export const SequenceTimeline: React.FC<SequenceTimelineProps> = ({ steps }) => {
  return (
    <div className="relative py-4">
      <div className="flex items-center justify-between overflow-x-auto pb-4 gap-4">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="flex-1 min-w-[180px] bg-white border border-gray-200 rounded-xl p-4 shadow-xs relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Day {step.day_offset}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 capitalize">
                  {step.tone}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700 text-sm font-medium">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>Follow-up #{idx + 1}</span>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 self-center" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
