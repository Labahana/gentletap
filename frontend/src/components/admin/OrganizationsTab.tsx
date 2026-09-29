import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, RefreshCw, UserCog } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Badge,
  ConfirmButton,
  Modal,
  Pagination,
  Section,
  fmtDate,
  fmtDateTime,
  fmtMoney,
} from '@/components/admin/adminUi';
import type { AuditRow, OrgDetail, OrgRow, Page } from '@/components/admin/types';

const LIMIT = 25;

const planTone = (plan: string) => (plan === 'starter' ? 'slate' : plan === 'team' ? 'blue' : 'green');

export const ImpersonationBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => !!localStorage.getItem('gt_impersonation'));
  if (!visible) return null;
  return (
    <div className="bg-amber-400 text-amber-950 text-xs font-semibold px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-50">
      <span>⚠ Impersonating a customer account. Actions are logged.</span>
      <button
        onClick={() => {
          const raw = localStorage.getItem('gt_admin_backup');
          localStorage.removeItem('gt_impersonation');
          if (raw) {
            useAuthStore.getState().setAuth(JSON.parse(raw));
          }
          window.location.href = '/admin';
        }}
        className="underline"
      >
        Exit impersonation
      </button>
    </div>
  );
};

const OrgDetailModal: React.FC<{ orgId: string; onClose: () => void }> = ({ orgId, onClose }) => {
  const qc = useQueryClient();
  const [plan, setPlan] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'org', orgId],
    queryFn: async () => (await api.get<OrgDetail>(`/admin/orgs/${orgId}`)).data,
  });
  const { data: audit } = useQuery({
    queryKey: ['admin', 'orgAudit', orgId],
    queryFn: async () =>
      (await api.get<Page<AuditRow>>(`/admin/orgs/${orgId}/audit`, { params: { limit: 10 } })).data,
  });

  useEffect(() => {
    if (data) setPlan(data.org.plan);
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'org', orgId] });
    qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    qc.invalidateQueries({ queryKey: ['admin', 'orgAudit', orgId] });
  };
  const act = (path: string, method: 'post' | 'patch' = 'post', body?: unknown) =>
    api({ url: `/admin/orgs/${orgId}/${path}`, method, data: body }).then(invalidate);

  if (isLoading || !data) return <p className="text-sm text-gray-500">Loading…</p>;
  const o = data.org;
  const c = data.counts;

  const doImpersonate = async () => {
    if (!data.owner) return;
    const r = await api.post(`/admin/orgs/${orgId}/impersonate`);
    const store = useAuthStore.getState();
    localStorage.setItem(
      'gt_admin_backup',
      JSON.stringify({
        user: store.user,
        orgId: store.orgId,
        orgName: store.orgName,
        plan: store.plan,
        accessToken: store.accessToken,
        refreshToken: store.refreshToken,
      }),
    );
    localStorage.setItem('gt_impersonation', '1');
    store.setAuth({
      user: { id: data.owner.id, email: data.owner.email, full_name: data.owner.full_name ?? undefined },
      orgId: o.id,
      orgName: o.name,
      plan: o.plan,
      accessToken: r.data.access_token,
      refreshToken: store.refreshToken ?? '',
    });
    window.location.href = '/dashboard';
  };

  return (
    <Modal title={o.name} onClose={onClose} wide>
      <div className="space-y-5">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={planTone(o.plan) as 'slate' | 'blue' | 'green'}>
            {o.plan} · {o.billing_period || 'monthly'}
          </Badge>
          {data.settings.operation_mode && <Badge tone="blue">{data.settings.operation_mode}</Badge>}
          {data.settings.pause_all && <Badge tone="amber">paused{data.settings.pause_reason ? `: ${data.settings.pause_reason}` : ''}</Badge>}
          {o.deletion_requested_at && <Badge tone="red">deletion requested {fmtDate(o.deletion_requested_at)}</Badge>}
          <span className="text-xs text-gray-400 ml-auto">Created {fmtDate(o.created_at)} · owner {data.owner?.email ?? '—'}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ['Unpaid invoices', `${c.invoices_unpaid + c.invoices_chasing}`],
            ['Chasing', String(c.invoices_chasing)],
            ['Collected', String(c.invoices_paid)],
            ['Open amount', fmtMoney(c.unpaid_amount)],
            ['Messages', String(c.messages)],
            ['Pending jobs', String(c.pending_jobs)],
            ['Collections', `${o.collections_used}/${o.collections_quota}`],
            ['WhatsApp', `${o.whatsapp_used}/${o.whatsapp_quota}`],
          ].map(([label, val]) => (
            <div key={label} className="bg-slate-50 border border-gray-100 rounded-xl p-3">
              <p className="font-bold text-gray-900">{val}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Connections</p>
          {data.connections.length === 0 ? (
            <p className="text-sm text-gray-500">None connected.</p>
          ) : (
            <div className="space-y-1.5">
              {data.connections.map((cn) => (
                <div key={cn.id} className="flex flex-wrap items-center gap-2 text-sm border border-gray-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-800 capitalize">{cn.provider}</span>
                  <Badge tone={cn.status === 'active' ? 'green' : cn.status === 'expired' ? 'red' : 'slate'}>{cn.status}</Badge>
                  {cn.token_expired && <Badge tone="red">token expired</Badge>}
                  {cn.token_expiring_soon && <Badge tone="amber">expires {fmtDate(cn.token_expires_at)}</Badge>}
                  <span className="text-xs text-gray-400 ml-auto">last sync {fmtDateTime(cn.last_sync_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.subscription && (
          <div className="text-sm flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Subscription:</span>
            <Badge tone={data.subscription.status === 'active' ? 'green' : 'amber'}>{data.subscription.status}</Badge>
            <span className="text-gray-500 text-xs">{data.subscription.plan}</span>
            {data.subscription.cancel_at_period_end && <Badge tone="red">cancels at period end</Badge>}
          </div>
        )}

        <Section title="Admin actions">
          <div className="flex flex-wrap gap-2 items-center">
            {data.settings.pause_all ? (
              <ConfirmButton
                tone="green"
                label="Resume reminders"
                confirmLabel="Resume?"
                onError={setError}
                onConfirm={() => act('resume-reminders')}
              />
            ) : (
              <ConfirmButton
                tone="gray"
                label="Pause all reminders"
                confirmLabel="Pause!"
                onError={setError}
                onConfirm={() =>
                  api({
                    url: `/admin/orgs/${orgId}/pause-reminders`,
                    method: 'post',
                    params: { reason: 'paused by admin' },
                  }).then(invalidate)
                }
              />
            )}
            <ConfirmButton label="Force sync" confirmLabel="Sync now" onError={setError} onConfirm={() => act('force-sync')} />
            <ConfirmButton label="Reset usage counters" confirmLabel="Reset" onError={setError} onConfirm={() => act('reset-counters')} />
            {data.owner && (
              <button
                onClick={doImpersonate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
              >
                <UserCog size={12} /> Impersonate
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t border-gray-100">
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {['starter', 'pro', 'pro_plus', 'team'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ConfirmButton
              tone="blue"
              label="Apply plan"
              confirmLabel="Apply"
              disabled={plan === o.plan}
              onError={setError}
              onConfirm={() =>
                api.patch(`/admin/orgs/${orgId}/plan`, { plan }).then(invalidate)
              }
            />
            <span className="text-xs text-gray-400">current: {o.plan}</span>
          </div>
        </Section>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recent org audit</p>
          {!audit || audit.items.length === 0 ? (
            <p className="text-sm text-gray-500">No events.</p>
          ) : (
            <ul className="space-y-1 text-xs text-gray-600">
              {audit.items.map((a) => (
                <li key={a.id} className="flex gap-2">
                  <span className="text-gray-400 w-32 shrink-0">{fmtDateTime(a.created_at)}</span>
                  <span className="font-medium">{a.action}</span>
                  <span className="text-gray-400">{a.actor_id}</span>
                  {a.ip && <span className="text-gray-300 ml-auto">{a.ip}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const OrganizationsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'orgs', debounced, offset],
    queryFn: async () =>
      (await api.get<Page<OrgRow>>('/admin/orgs', { params: { search: debounced || undefined, limit: LIMIT, offset } })).data,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by org name or owner email…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-sm"
        />
        {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Collections</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((o) => (
              <tr
                key={o.id}
                onClick={() => setDetail(o.id)}
                className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {o.name}
                  {o.paused && <Badge tone="amber">paused</Badge>}
                </td>
                <td className="px-4 py-3 text-gray-600">{o.owner_email ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={planTone(o.plan) as 'slate' | 'blue' | 'green'}>{o.plan}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">{o.operation_mode ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {o.collections_used}/{o.collections_quota}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {o.whatsapp_used}/{o.whatsapp_quota || '∞'}
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(o.created_at)}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={data?.total ?? 0} limit={LIMIT} offset={offset} onOffset={setOffset} />
      {detail && <OrgDetailModal orgId={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};
