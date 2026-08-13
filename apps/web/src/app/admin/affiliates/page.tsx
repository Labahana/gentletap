"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminTable,
  formatAdminDate,
} from "@/components/admin/ui";
import { api } from "@/lib/api";

type AffiliateRow = Awaited<ReturnType<typeof api.adminAffiliates>>["items"][number];

export default function AdminAffiliatesPage() {
  const [items, setItems] = useState<AffiliateRow[]>([]);
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminAffiliates({ status: status || undefined, limit: 100 });
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function approve(id: string) {
    const result = await api.adminApproveAffiliate(id);
    setMsg(`Approved — ref code: ${result.ref_code}`);
    await load();
  }

  async function reject(id: string) {
    if (!confirm("Reject this application?")) return;
    await api.adminRejectAffiliate(id);
    setMsg("Rejected");
    await load();
  }

  if (loading && items.length === 0) return <AdminLoading />;

  return (
    <>
      <AdminPageHeader
        title="Affiliates"
        description="Review creator applications, approve partners, and record payouts"
        actions={<AdminButton onClick={() => void load()}>Refresh</AdminButton>}
      />

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {msg && <AdminAlert tone="success">{msg}</AdminAlert>}

      <div className="mb-4 flex flex-wrap gap-2">
        {["pending", "active", "paused", "rejected", ""].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              status === s ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      <AdminTable>
        <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
          <tr>
            {["Partner", "Type", "Channel", "Status", "Rate", "Signups", "Active", "Earnings", "Applied", ""].map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={10}>
                <AdminEmpty message="No affiliates in this filter" />
              </td>
            </tr>
          ) : (
            items.map((a) => (
              <tr key={a.id} className="border-b border-slate-800/80">
                <td className="px-4 py-3">
                  <Link href={`/admin/affiliates/${a.id}`} className="font-medium text-amber-400 hover:underline">
                    {a.name}
                  </Link>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={a.partner_type === "accountant" ? "ok" : "neutral"}>
                    {a.partner_type}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-slate-300">{a.channel_name || "—"}</td>
                <td className="px-4 py-3">
                  <AdminBadge tone={a.status === "active" ? "ok" : a.status === "pending" ? "warn" : "neutral"}>
                    {a.status}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3">
                  {Math.round(a.commission_rate * 100)}%
                  {a.commission_rate > 0.3 && (
                    <span className="ml-1 text-xs text-amber-400">founder</span>
                  )}
                </td>
                <td className="px-4 py-3">{a.signups}</td>
                <td className="px-4 py-3">{a.active_subscribers}</td>
                <td className="px-4 py-3">${a.lifetime_earnings.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-400">{formatAdminDate(a.created_at)}</td>
                <td className="px-4 py-3">
                  {a.status === "pending" ? (
                    <div className="flex gap-2">
                      <AdminButton variant="primary" onClick={() => void approve(a.id)}>
                        Approve
                      </AdminButton>
                      <AdminButton onClick={() => void reject(a.id)}>Reject</AdminButton>
                    </div>
                  ) : (
                    <Link href={`/admin/affiliates/${a.id}`} className="text-sm text-slate-400 hover:text-white">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </>
  );
}
