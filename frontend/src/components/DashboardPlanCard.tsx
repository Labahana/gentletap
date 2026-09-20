import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sparkles, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '@/lib/api';

/**
 * Free-plan usage meter + upgrade CTA, shown on the dashboard for Starter orgs.
 * Mirrors the old project's DashboardUpgradeCard.
 */
export const DashboardPlanCard: React.FC = () => {
  const navigate = useNavigate();

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => (await api.get('/dashboard/usage')).data,
  });

  const checkout = useMutation({
    mutationFn: async () => (await api.post('/billing/checkout', { plan: 'pro', annual: false })).data,
    onSuccess: (data) => {
      if (data?.checkout_url && !data.mock) {
        window.location.href = data.checkout_url; // Paddle hosted checkout
      } else if (data?.checkout_url) {
        // Mock checkout URL — navigate to it
        window.location.href = data.checkout_url;
      }
      // If no checkout_url, error will be shown via isError
    },
  });

  if (!usage || usage.plan !== 'starter') return null;

  const used = usage.collections_used || 0;
  const quota = usage.collections_quota || 5;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">You're on the Starter plan</h3>
          <p className="text-xs text-gray-500 mt-1">
            Free plan: {used} of {quota} invoice collections used this month.
          </p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5 text-xs text-gray-700 mb-4">
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          5 invoice collections per month
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          QuickBooks, FreshBooks &amp; CSV import
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          AI-drafted reminders you approve before sending
        </div>
      </div>

      {checkout.isError && (
        <p className="text-xs text-rose-600 mb-2">{apiErrorMessage(checkout.error as any, 'Could not start checkout')}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {checkout.isPending ? 'Starting checkout…' : 'Upgrade to Pro — $19/mo'}
        </button>
        <Link
          to="/billing"
          className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          See plans
        </Link>
      </div>
    </div>
  );
};
