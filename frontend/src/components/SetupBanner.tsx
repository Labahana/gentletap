import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { useResumeSetup } from '@/hooks/useOnboardingStatus';

const DISMISS_KEY = 'gentletap.setupBannerDismissed';

export const SetupBanner: React.FC = () => {
  const { items, doneCount, total, shouldShow } = useSetupProgress();
  const resume = useResumeSetup();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  // Session-scoped hide: re-appears on the next login until setup completes.
  if (!shouldShow || dismissed) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-xs relative">
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded"
        title="Hide until next login"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900">Finish setting up GentleTap</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {doneCount} of {total} done
            </span>
          </div>
          <div className="h-1.5 w-full max-w-xs bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
            {items.map((item) =>
              item.done ? (
                <li key={item.key} className="flex items-center gap-1.5 text-xs text-gray-400 line-through">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {item.label}
                </li>
              ) : (
                <li key={item.key}>
                  <Link
                    to={item.link}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-blue-700"
                  >
                    <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
        <button
          onClick={() => resume.mutate()}
          disabled={resume.isPending}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs shrink-0"
        >
          <Rocket className="w-3.5 h-3.5" />
          {resume.isPending ? 'Opening…' : 'Resume setup'}
        </button>
      </div>
    </div>
  );
};
