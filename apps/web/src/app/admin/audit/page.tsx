"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  formatAdminDate,
} from "@/components/admin/ui";
import { api, getToken } from "@/lib/api";
import type { AdminAuditEntry } from "@/lib/admin-types";

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{
    items: AdminAuditEntry[];
    total: number;
    limit: number;
    offset: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setData(await api.adminAudit(token, { limit: PAGE_SIZE, offset }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="Immutable record of platform admin actions"
      />

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {loading && !data ? <AdminLoading /> : null}

      {data && (
        <>
          <AdminTable>
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                    {formatAdminDate(entry.created_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{entry.admin_email}</td>
                  <td className="px-3 py-2 font-mono text-xs text-amber-300">{entry.action}</td>
                  <td className="px-3 py-2">
                    {entry.target_user_id ? (
                      <Link href={`/admin/users/${entry.target_user_id}`} className="text-amber-400 hover:underline">
                        {entry.target_email || entry.target_user_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{entry.ip_address || "—"}</td>
                  <td className="max-w-xs px-3 py-2">
                    {entry.metadata ? (
                      <pre className="overflow-x-auto text-[10px] text-slate-500">
                        {JSON.stringify(entry.metadata)}
                      </pre>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          {data.items.length === 0 && <AdminEmpty message="No audit entries yet" />}
          <AdminPagination total={data.total} limit={data.limit} offset={data.offset} onPage={setOffset} />
        </>
      )}
    </>
  );
}
