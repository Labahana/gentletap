import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, ConfirmButton, Pagination, fmtDateTime } from '@/components/admin/adminUi';
import type { JobsPage } from '@/components/admin/types';

const LIMIT = 50;

const statusTone = (s: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'sent' ? 'green' : s === 'pending' ? 'blue' : s === 'processing' ? 'amber' : s === 'failed' ? 'red' : 'slate';

export const JobsTab: React.FC<{ initialStatus?: string }> = ({ initialStatus }) => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(initialStatus ?? '');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'jobs', status, offset],
    queryFn: async () =>
      (await api.get<JobsPage>('/admin/jobs', { params: { status: status || undefined, limit: LIMIT, offset } })).data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
  const act = (path: string) => api.post(`/admin/${path}`).then(refresh);

  const counts = data?.counts ?? {};

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['', 'pending', 'processing', 'sent', 'failed', 'cancelled', 'stuck'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatus(s);
              setOffset(0);
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            {s || 'all'}
            {s && counts[s] !== undefined && ` (${counts[s]})`}
          </button>
        ))}
        {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {(counts.stuck ?? 0) > 0 && (
            <ConfirmButton
              tone="blue"
              label={`Requeue ${counts.stuck} stuck`}
              confirmLabel="Requeue all"
              onError={setError}
              onConfirm={() => act('jobs/requeue-stuck')}
            />
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Org</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Step</th>
              <th className="px-4 py-3 font-semibold">Scheduled</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Attempts</th>
              <th className="px-4 py-3 font-semibold">Last error</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((j) => (
              <tr key={j.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 text-gray-800">{j.org_name ?? j.org_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-600">{j.invoice_number ?? j.invoice_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-600">#{j.sequence_step}</td>
                <td className="px-4 py-3 text-gray-500">{fmtDateTime(j.scheduled_for)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(j.status)}>{j.status}</Badge>
                  {j.stuck && <Badge tone="red">stuck</Badge>}
                </td>
                <td className="px-4 py-3 text-gray-600">{j.attempts}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={j.last_error ?? ''}>
                  {j.last_error ?? '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {(j.status === 'failed' || j.stuck || j.status === 'cancelled') && (
                    <ConfirmButton
                      tone="blue"
                      label="Requeue"
                      confirmLabel="Requeue"
                      onError={setError}
                      onConfirm={() => act(`jobs/${j.id}/requeue`)}
                    />
                  )}
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No jobs match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={data?.total ?? 0} limit={LIMIT} offset={offset} onOffset={setOffset} />
    </div>
  );
};
