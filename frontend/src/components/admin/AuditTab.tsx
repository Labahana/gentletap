import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Pagination, fmtDateTime } from '@/components/admin/adminUi';
import type { AuditRow, Page } from '@/components/admin/types';

const LIMIT = 50;

export const AuditTab: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'audit', offset],
    queryFn: async () => (await api.get<Page<AuditRow>>('/admin/audit-log', { params: { limit: LIMIT, offset } })).data,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs text-gray-500">Every admin action (and impersonation) is recorded here with the caller IP.</p>
        {isFetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Entity</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="px-4 py-3 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((a) => (
              <tr key={a.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.actor_type === 'admin' ? 'blue' : a.actor_type === 'system' ? 'slate' : 'green'}>
                    {a.actor_type}
                  </Badge>
                  <div className="text-[11px] text-gray-400 mt-1 max-w-[160px] truncate" title={a.actor_id ?? ''}>
                    {a.actor_id ?? ''}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{a.action}</td>
                <td className="px-4 py-3 text-gray-600">
                  {a.entity_type}
                  {a.entity_id ? `#${String(a.entity_id).slice(0, 8)}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[260px]">
                  {a.details ? JSON.stringify(a.details) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.ip ?? '—'}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No audit events recorded.
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
