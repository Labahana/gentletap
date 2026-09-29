import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Badge,
  ConfirmButton,
  Modal,
  Pagination,
  Section,
  fmtDate,
  fmtDateTime,
} from '@/components/admin/adminUi';
import type { Page, UserDetail, UserRow } from '@/components/admin/types';

const LIMIT = 25;

const UserDetailModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => (await api.get<UserDetail>(`/admin/users/${userId}`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };
  const act = (path: string) => api.post(`/admin/users/${userId}/${path}`).then(invalidate);

  if (isLoading || !data) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <Modal title={data.email} onClose={onClose} wide>
      <div className="space-y-5">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={data.is_active ? 'green' : 'red'}>{data.is_active ? 'active' : 'suspended'}</Badge>
          {data.is_deleting && <Badge tone="amber">deletion in grace period</Badge>}
          <span className="text-xs text-gray-400 ml-auto">
            Joined {fmtDateTime(data.created_at)} · {data.full_name ?? 'no name'}
          </span>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Organizations</p>
          {data.orgs.length === 0 ? (
            <p className="text-sm text-gray-500">Owns no organization.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.orgs.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm border border-gray-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-800">{o.name}</span>
                  <Badge tone="blue">{o.plan}</Badge>
                  <span className="text-xs text-gray-500">
                    collections {o.collections_used}/{o.collections_quota} · whatsapp {o.whatsapp_used}/{o.whatsapp_quota}
                  </span>
                  {o.deletion_requested_at && (
                    <Badge tone="red">deletion {fmtDate(o.deletion_requested_at)}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Section title="Admin actions">
          <div className="flex flex-wrap gap-2">
            {data.is_active ? (
              <ConfirmButton
                tone="red"
                label="Suspend account"
                confirmLabel="Suspend!"
                onError={setError}
                onConfirm={() => act('suspend')}
              />
            ) : (
              <ConfirmButton
                tone="green"
                label="Reactivate account"
                confirmLabel="Reactivate"
                onError={setError}
                onConfirm={() => act('unsuspend')}
              />
            )}
            {data.is_deleting ? (
              <ConfirmButton
                tone="green"
                label="Cancel deletion"
                confirmLabel="Cancel deletion"
                onError={setError}
                onConfirm={() => act('cancel-deletion')}
              />
            ) : (
              <ConfirmButton
                tone="red"
                label="Request deletion (GDPR)"
                confirmLabel="Start 30-day purge?"
                onError={setError}
                onConfirm={() => act('request-deletion')}
              />
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Suspension blocks login and all API access immediately. Deletion runs the same 30-day
            GDPR grace flow the user can start themselves.
          </p>
        </Section>
      </div>
    </Modal>
  );
};

export const UsersTab: React.FC = () => {
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
    queryKey: ['admin', 'users', debounced, offset],
    queryFn: async () =>
      (await api.get<Page<UserRow>>('/admin/users', { params: { search: debounced || undefined, limit: LIMIT, offset } })).data,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-sm"
        />
        {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Organizations</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((u) => (
              <tr
                key={u.id}
                onClick={() => setDetail(u.id)}
                className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer"
              >
                <td className="px-4 py-3 text-gray-800">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {u.orgs.length === 0 ? '—' : u.orgs.map((o) => `${o.name} (${o.plan})`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.is_active ? 'green' : 'red'}>{u.is_active ? 'active' : 'suspended'}</Badge>
                  {u.is_deleting && <Badge tone="amber">deleting</Badge>}
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={data?.total ?? 0} limit={LIMIT} offset={offset} onOffset={setOffset} />
      {detail && <UserDetailModal userId={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};
