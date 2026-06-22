"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ConnectQuickBooksButton } from "@/components/connect-quickbooks-button";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { planLabel } from "@/lib/pricing";
import { autoSyncStatusLine } from "@/lib/onboarding";

type WhatsappStatus = Awaited<ReturnType<typeof api.whatsappStatus>>;
export type ConnectionsPanelMode = "email" | "integrations";

function ConnectionsPanelContent({ mode }: { mode: ConnectionsPanelMode }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = `/settings/${mode}`;

  const [emailReady, setEmailReady] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [qbConnected, setQbConnected] = useState(false);
  const [wa, setWa] = useState<WhatsappStatus | null>(null);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [purchaseNote, setPurchaseNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qbSyncing, setQbSyncing] = useState(false);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbLastSyncAt, setQbLastSyncAt] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [inbound, setInbound] = useState<
    Array<{ id: string; from_phone: string; body: string; invoice_id: string | null }>
  >([]);

  useEffect(() => {
    if (mode === "integrations" && searchParams.get("whatsapp_purchased") === "1") {
      setPurchaseNote("WhatsApp message pack purchased — credits added to your account.");
    }
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    if (email === "connected") {
      setPurchaseNote("Gmail connected — reminders will send from your inbox.");
      void loadStatus();
      router.replace(basePath);
    } else if (email === "error") {
      setLoadError(message ?? "Gmail connection failed");
      router.replace(basePath);
    }
  }, [searchParams, router, basePath, mode]);

  async function loadStatus() {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    try {
      const [email, qb, whatsapp, replies, google] = await Promise.all([
        api.emailStatus(token),
        api.qbSyncStatus(token),
        api.whatsappStatus(token).catch(() => null),
        api.whatsappInbound(token).catch(() => ({ items: [] })),
        api.googleStatus(token).catch(() => ({ connected: false, email: undefined })),
      ]);
      setEmailReady(email.ready);
      setEmailProvider(email.provider);
      setGoogleConnected(google.connected);
      setGoogleEmail(google.email ?? null);
      setQbConnected(!!qb.connected);
      setQbLastSyncAt(qb.last_sync_at ?? null);
      setQbSyncing(qb.status === "syncing");
      if (whatsapp) setWa(whatsapp);
      setInbound(replies.items);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load connection status");
    }
  }

  useEffect(() => {
    if (user) void loadStatus();
  }, [user]);

  useEffect(() => {
    if (!user || !qbConnected || mode !== "integrations") return;
    const interval = setInterval(() => void loadStatus(), 60_000);
    return () => clearInterval(interval);
  }, [user, qbConnected, mode]);

  async function connectQb() {
    const token = getToken();
    if (!token) return;
    setQbConnecting(true);
    setLoadError(null);
    try {
      const { authorization_url } = await api.qbConnectUrl(token);
      window.location.href = authorization_url;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not start QuickBooks connection");
      setQbConnecting(false);
    }
  }

  async function disconnectQb() {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Disconnect from QuickBooks? Invoice sync and payment detection will stop.")) return;
    setLoadError(null);
    try {
      await api.qbDisconnect(token);
      await loadStatus();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not disconnect QuickBooks");
    }
  }

  async function switchEmailProvider(provider: "google" | "resend") {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    try {
      await api.updateEmailPreferences(token, provider);
      await loadStatus();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not update email preference");
    }
  }

  async function connectGmail() {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    try {
      const { authorization_url } = await api.googleConnectUrl(token, "settings");
      window.location.href = authorization_url;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not start Gmail connection");
    }
  }

  async function verifyResend() {
    const token = getToken();
    if (!token || !resendEmail.trim()) return;
    setLoadError(null);
    try {
      await api.verifyResendSender(token, resendEmail.trim());
      await loadStatus();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Resend verification failed");
    }
  }

  async function disconnectGmail() {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Disconnect Gmail? Reminders will stop sending via Gmail until you reconnect or switch to Resend.")) return;
    setLoadError(null);
    try {
      await api.googleDisconnect(token);
      await loadStatus();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not disconnect Gmail");
    }
  }

  async function connectShared() {
    const token = getToken();
    if (!token) return;
    setWaBusy(true);
    setWaError(null);
    try {
      await api.whatsappConnectShared(token);
      await loadStatus();
    } catch (e) {
      setWaError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setWaBusy(false);
    }
  }

  async function disconnectWhatsapp() {
    const token = getToken();
    if (!token) return;
    setWaBusy(true);
    try {
      await api.whatsappDisconnect(token);
      await loadStatus();
    } finally {
      setWaBusy(false);
    }
  }

  async function buyPack(pack: "pack_250" | "pack_500") {
    const token = getToken();
    if (!token) return;
    setWaBusy(true);
    setWaError(null);
    try {
      const { checkout_url } = await api.whatsappCheckoutMessages(token, pack);
      window.location.href = checkout_url;
    } catch (e) {
      setWaError(e instanceof Error ? e.message : "Checkout unavailable");
      setWaBusy(false);
    }
  }

  if (!user) return null;

  const waEligible = wa?.plan_eligible ?? false;
  const waConnected = wa?.connected ?? false;

  return (
    <div>
      <h2 className="text-lg font-semibold">
        {mode === "email" ? "Email Settings" : "Integrations"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {mode === "email"
          ? "Connect Gmail or verify a domain email so GentleTap can send payment reminders on your behalf."
          : "Connect QuickBooks and WhatsApp — GentleTap syncs invoices every 30 minutes. Spreadsheet uploads are managed manually on the Invoices page."}
      </p>

      {purchaseNote && (
        <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800">
          {purchaseNote}
        </p>
      )}

      {loadError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {mode === "integrations" && (
          <div className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">QuickBooks Online</p>
              {qbConnected ? (
                <>
                  <p className="text-sm font-medium text-green">Connected · running automatically</p>
                  <p className="mt-1 text-xs text-muted">
                    Read-only access · {qbSyncing ? "Syncing now…" : autoSyncStatusLine(qbLastSyncAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Not connected — connect to import invoices from QuickBooks Online
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {qbConnected ? (
                <button type="button" className="btn-secondary text-sm" onClick={disconnectQb}>
                  Disconnect
                </button>
              ) : (
                <ConnectQuickBooksButton onClick={connectQb} busy={qbConnecting} size="sm" />
              )}
            </div>
          </div>
        )}

        {mode === "email" && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Sending email</p>
                <p className="text-sm text-muted">
                  {emailReady
                    ? emailProvider === "google" && googleEmail
                      ? `Gmail connected (${googleEmail})`
                      : `Ready via ${emailProvider}`
                    : "Not connected — connect Gmail to grant send permission (separate from sign-in)"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {googleConnected && (
                  <button type="button" className="btn-secondary text-sm" onClick={disconnectGmail}>
                    Disconnect Gmail
                  </button>
                )}
                {!emailReady && (
                  <button type="button" className="btn-secondary shrink-0 text-sm" onClick={connectGmail}>
                    Connect Gmail
                  </button>
                )}
              </div>
            </div>
            {emailReady && emailProvider && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted">Send reminders via</p>
                <div className="flex gap-2">
                  {(["google", "resend"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
                        emailProvider === p ? "border-accent bg-accent/10" : "border-border"
                      }`}
                      onClick={() => switchEmailProvider(p)}
                    >
                      {p === "google" ? "Gmail" : "Resend"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!emailReady && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs text-muted">Or verify a domain email via Resend</p>
                <input
                  type="email"
                  className="input"
                  placeholder="you@yourdomain.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary w-full text-sm"
                  onClick={verifyResend}
                  disabled={!resendEmail.trim()}
                >
                  Send verification link
                </button>
              </div>
            )}
          </div>
        )}

        {mode === "integrations" && (
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">WhatsApp</p>
                <p className="text-sm text-muted">
                  {!waEligible
                    ? `Requires Pro+ or Team (current: ${planLabel(user.plan)})`
                    : waConnected
                      ? "GentleTap WhatsApp number — your name appears in each message"
                      : "Not connected — enable WhatsApp payment reminders"}
                </p>
              </div>
              {waConnected && (
                <button
                  type="button"
                  className="btn-secondary shrink-0 text-sm"
                  onClick={disconnectWhatsapp}
                  disabled={waBusy}
                >
                  Disconnect
                </button>
              )}
            </div>

            {waEligible && wa && (
              <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                <p>
                  <span className="font-medium">This month:</span> {wa.monthly_used} / {wa.monthly_limit}{" "}
                  WhatsApp
                  {wa.extra_credits > 0 && ` · +${wa.extra_credits} purchased`}
                </p>
                {wa.cap_reached && (
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    Monthly limit reached — remaining reminders use email only.
                  </p>
                )}
              </div>
            )}

            {waError && <p className="text-sm text-red-600">{waError}</p>}

            {waEligible && !waConnected && (
              <div className="space-y-3 border-t border-border pt-4">
                {wa?.shared_available ? (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-medium">Enable WhatsApp reminders</p>
                    <p className="mt-1 text-xs text-muted">
                      Reminders are sent from GentleTap&apos;s verified WhatsApp Business number. Your
                      business name appears in the message.
                    </p>
                    <button
                      type="button"
                      className="btn-primary mt-3 text-sm"
                      onClick={connectShared}
                      disabled={waBusy}
                    >
                      Enable WhatsApp
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    WhatsApp is not configured on the platform yet. Contact{" "}
                    <a href="mailto:support@gentletap.co" className="text-accent hover:underline">
                      support@gentletap.co
                    </a>
                    .
                  </p>
                )}
              </div>
            )}

            {waEligible && wa?.cap_reached && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium">Buy more WhatsApp messages</p>
                <p className="mt-1 text-xs text-muted">One-time packs add to your account.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => buyPack("pack_250")}
                    disabled={waBusy}
                  >
                    +250 messages
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => buyPack("pack_500")}
                    disabled={waBusy}
                  >
                    +500 messages
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "integrations" && waConnected && inbound.length > 0 && (
          <div className="card space-y-3">
            <p className="font-semibold">Recent WhatsApp replies</p>
            <ul className="space-y-2 text-sm">
              {inbound.slice(0, 5).map((msg) => (
                <li key={msg.id} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted">{msg.from_phone}</p>
                  <p className="mt-1">{msg.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectionsPanel({ mode }: { mode: ConnectionsPanelMode }) {
  return (
    <Suspense
      fallback={<div className="h-32 animate-pulse rounded-xl bg-border" />}
    >
      <ConnectionsPanelContent mode={mode} />
    </Suspense>
  );
}
