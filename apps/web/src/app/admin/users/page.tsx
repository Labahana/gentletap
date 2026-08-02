"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminBadge,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  formatAdminDate,
} from "@/components/admin/ui";
import { api } from "@/lib/api";

const PLANS = ["", "free", "pro", "pro_plus", "team"];
const STEPS = ["", "account", "invoice_import", "email", "preview", "pricing", "live"];

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [step, setStep] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminUsers>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await api.adminUsers({
          search: query || undefined,
          plan: plan || undefined,
          onboarding_step: step || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [query, plan, step, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQuery(search.trim());
  }

  return (
    <>
      <AdminPageHeader title="Users" description="Search and inspect platform accounts" />

      <form onSubmit={applyFilters} className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, company, name…"
          className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setOffset(0);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {PLANS.map((p) => (
            <option key={p || "all"} value={p}>
              {p ? p : "All plans"}
            </option>
          ))}
        </select>
        <select
          value={step}
          onChange={(e) => {
            setStep(e.target.value);
            setOffset(0);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {STEPS.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? s : "All steps"}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
          Search
        </button>
      </form>

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {loading && !data ? <AdminLoading /> : null}

      {data && (
        <>
          <AdminTable>
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Onboarding</th>
                <th className="px-3 py-2">Connections</th>
                <th className="px-3 py-2">Last sync</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-amber-400 hover:underline">
                      {u.email}
                    </Link>
                    {(u.full_name || u.company_name) && (
                      <div className="text-xs text-slate-500">
                        {[u.full_name, u.company_name].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <AdminBadge tone="accent">{u.plan}</AdminBadge>
                  </td>
                  <td className="px-3 py-2">{u.onboarding_step}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    QB {u.qb_connected ? "✓" : "—"} · FB {u.fb_connected ? "✓" : "—"} · Gmail{" "}
                    {u.google_connected ? "✓" : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{formatAdminDate(u.last_sync_at)}</td>
                  <td className="px-3 py-2 text-slate-400">{formatAdminDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          {data.items.length === 0 && <AdminEmpty message="No users match your filters" />}
          <AdminPagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onPage={setOffset}
          />
        </>
      )}
    </>
  );
}
