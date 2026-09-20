import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import { openOverlayCheckout, usePaddleConfig } from '@/lib/paddle';
import { PlanCard } from '@/components/billing/PlanCard';
import { PricingToggle } from '@/components/billing/PricingToggle';
import { UsageBar } from '@/components/billing/UsageBar';
import { CreditPackModal } from '@/components/billing/CreditPackModal';

const FEATURES: Record<string, string[]> = {
  starter: ['5 collections / month', 'CSV import', 'Template mode', '1 seat'],
  pro: ['Unlimited collections', 'Autopilot', 'AI drafting', '1 seat'],
  pro_plus: ['Everything in Pro', '450 WhatsApp / mo', 'Escalations', 'Credit packs'],
  team: ['Everything in Pro+', '850 WhatsApp / mo', '3 seats', 'Shared dashboard'],
};

export const Billing: React.FC = () => {
  const [annual, setAnnual] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const qc = useQueryClient();
  const { data: paddleConfig } = usePaddleConfig();

  const { data: sub, isLoading, error: subError } = useQuery({
    queryKey: ['billingSubscription'],
    queryFn: async () => (await api.get('/billing/subscription')).data,
  });

  const { data: plansData, error: plansError } = useQuery({
    queryKey: ['publicPlans'],
    queryFn: async () => (await api.get('/public/plans')).data,
  });

  const checkout = useMutation({
    mutationFn: async (plan: string) => {
      const { data } = await api.post('/billing/checkout', { plan, annual });
      const opened = await openOverlayCheckout({
        config: paddleConfig,
        transactionId: data.transaction_id,
        successUrl: `${window.location.origin}/billing?checkout=success`,
      });
      if (opened) return data;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return data;
      }
      throw new Error('Checkout is not available right now. Please try again later.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billingSubscription'] });
    },
  });

  const cancel = useMutation({
    mutationFn: async () => api.post('/billing/cancel'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billingSubscription'] }),
  });

  const credits = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/credit-packs');
      const opened = await openOverlayCheckout({
        config: paddleConfig,
        transactionId: data.transaction_id,
        successUrl: `${window.location.origin}/billing?credits=success`,
      });
      if (opened) return data;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return data;
      }
      throw new Error('Checkout is not available right now. Please try again later.');
    },
    onSuccess: () => {
      setCreditsOpen(false);
      qc.invalidateQueries({ queryKey: ['billingSubscription'] });
    },
  });

  const portal = useMutation({
    mutationFn: async () => (await api.get('/billing/portal')).data,
    onSuccess: (data) => {
      if (data.portal_url) window.open(data.portal_url, '_blank');
    },
  });

  const plans = plansData?.plans || [];
  const current = sub?.plan || 'starter';

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan, usage, and WhatsApp credits</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Current plan</div>
          <div className="text-2xl font-bold text-gray-900 capitalize">{isLoading ? '…' : current.replace('_', '+')}</div>
          <div className="text-xs text-gray-500 mt-1">
            Status: {sub?.status || 'active'}
            {sub?.cancel_at_period_end ? ' · Cancels at period end' : ''}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => portal.mutate()}
              className="text-xs font-semibold border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              Customer portal
            </button>
            {current !== 'starter' && (
              <button
                onClick={() => cancel.mutate()}
                className="text-xs font-semibold border border-rose-200 text-rose-700 px-3 py-2 rounded-lg"
              >
                Cancel plan
              </button>
            )}
            {(current === 'pro_plus' || current === 'team') && (
              <button
                onClick={() => setCreditsOpen(true)}
                className="text-xs font-semibold bg-blue-600 text-white px-3 py-2 rounded-lg"
              >
                Buy WhatsApp credits
              </button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <UsageBar
            label="Collections"
            used={sub?.usage?.collections_used || 0}
            quota={sub?.usage?.collections_quota || 5}
          />
          <UsageBar
            label="WhatsApp"
            used={sub?.usage?.whatsapp_used || 0}
            quota={sub?.usage?.whatsapp_quota || 0}
            suffix={sub?.usage?.whatsapp_credits ? ` (+${sub.usage.whatsapp_credits} credits)` : ''}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Change plan</h2>
        <PricingToggle annual={annual} onChange={setAnnual} />
      </div>

      {plansError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          Failed to load plans. Please refresh the page or try again later.
        </div>
      )}

      {checkout.isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          {apiErrorMessage(checkout.error as any, 'Checkout failed')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.length === 0 && !plansError && (
          <div className="col-span-full text-center py-8 text-sm text-gray-500">
            Loading plans...
          </div>
        )}
        {plans.map((p: any) => (
          <PlanCard
            key={p.id}
            name={p.name}
            price={annual ? p.annual : p.monthly}
            period={annual ? 'annual' : 'monthly'}
            features={FEATURES[p.id] || []}
            current={current === p.id}
            highlighted={p.id === 'pro_plus'}
            loading={checkout.isPending}
            onSelect={() => {
              if (p.id === 'starter') {
                api.post('/billing/change-plan', { plan: 'starter' }).then(() =>
                  qc.invalidateQueries({ queryKey: ['billingSubscription'] })
                );
              } else {
                checkout.mutate(p.id);
              }
            }}
          />
        ))}
      </div>

      <CreditPackModal
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        onBuy={() => credits.mutate()}
        loading={credits.isPending}
      />
    </div>
  );
};
