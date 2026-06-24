"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { api, getToken } from "@/lib/api";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminUsers>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setData(await api.adminUsers(token, { search: query || undefined, limit: 50 }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold text-white">Users</h1>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, company, name…"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
          Search
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {data && (
        <>
          <p className="mt-3 text-xs text-slate-500">{data.total} user(s)</p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Step</th>
                  <th className="px-3 py-2">QB</th>
                  <th className="px-3 py-2">Gmail</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-amber-400 hover:underline">
                        {u.email}
                      </Link>
                      {u.company_name && (
                        <div className="text-xs text-slate-500">{u.company_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{u.plan}</td>
                    <td className="px-3 py-2">{u.onboarding_step}</td>
                    <td className="px-3 py-2">{u.qb_connected ? "✓" : "—"}</td>
                    <td className="px-3 py-2">{u.google_connected ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
