"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ConnectionsSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [emailReady, setEmailReady] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [qbConnected, setQbConnected] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([api.emailStatus(token), api.qbSyncStatus(token)]).then(([email, qb]) => {
      setEmailReady(email.ready);
      setEmailProvider(email.provider);
      setQbConnected(!!qb.connected);
    });
  }, [user]);

  async function connectQb() {
    const token = getToken();
    if (!token) return;
    const { authorization_url } = await api.qbConnectUrl(token);
    window.location.href = authorization_url;
  }

  async function connectGmail() {
    const token = getToken();
    if (!token) return;
    const { authorization_url } = await api.googleConnectUrl(token);
    window.location.href = authorization_url;
  }

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Connections</h1>
      <div className="mt-8 space-y-4">
        <div className="card flex items-center justify-between">
          <div>
            <p className="font-semibold">QuickBooks</p>
            <p className="text-sm text-muted">{qbConnected ? "Connected" : "Not connected"}</p>
          </div>
          {!qbConnected && (
            <button className="btn-secondary text-sm" onClick={connectQb}>
              Connect
            </button>
          )}
        </div>
        <div className="card flex items-center justify-between">
          <div>
            <p className="font-semibold">Email</p>
            <p className="text-sm text-muted">
              {emailReady ? `Ready via ${emailProvider}` : "Not connected"}
            </p>
          </div>
          {!emailReady && (
            <button className="btn-secondary text-sm" onClick={connectGmail}>
              Connect Gmail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
