"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { planLabel } from "@/lib/pricing";
import { WhatsappEmbeddedSignup } from "@/components/whatsapp-embedded-signup";

type WhatsappStatus = Awaited<ReturnType<typeof api.whatsappStatus>>;

function ConnectionsSettingsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailReady, setEmailReady] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [qbConnected, setQbConnected] = useState(false);
  const [wa, setWa] = useState<WhatsappStatus | null>(null);
  const [ownPhone, setOwnPhone] = useState("");
  const [ownWaba, setOwnWaba] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [purchaseNote, setPurchaseNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qbSyncing, setQbSyncing] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [inbound, setInbound] = useState<
    Array<{ id: string; from_phone: string; body: string; invoice_id: string | null }>
  >([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (searchParams.get("whatsapp_purchased") === "1") {
      setPurchaseNote("WhatsApp message pack purchased — credits added to your account.");
    }
  }, [searchParams]);

  async function loadStatus() {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    try {
      const [email, qb, whatsapp, replies] = await Promise.all([
        api.emailStatus(token),
        api.qbSyncStatus(token),
        api.whatsappStatus(token).catch(() => null),
        api.whatsappInbound(token).catch(() => ({ items: [] })),
      ]);
      setEmailReady(email.ready);
      setEmailProvider(email.provider);
      setQbConnected(!!qb.connected);
      if (whatsapp) setWa(whatsapp);
      setInbound(replies.items);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load connection status");
    }
  }

  useEffect(() => {
    loadStatus();
  }, [user]);

  async function connectQb() {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    try {
      const { authorization_url } = await api.qbConnectUrl(token);
      window.location.href = authorization_url;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not start QuickBooks connection");
    }
  }

  async function syncQb() {
    const token = getToken();
    if (!token) return;
    setQbSyncing(true);
    setLoadError(null);
    try {
      await api.qbSync(token);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setQbSyncing(false);
    }
  }

  async function disconnectQb() {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Disconnect QuickBooks? Invoice sync will stop.")) return;
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
      const { authorization_url } = await api.googleConnectUrl(token);
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

  async function connectOwn() {
    const token = getToken();
    if (!token || !ownPhone.trim()) return;
    setWaBusy(true);
    setWaError(null);
    try {
      await api.whatsappConnectOwn(token, ownPhone.trim(), ownWaba.trim() || undefined);
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

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  const waEligible = wa?.plan_eligible ?? false;
  const waConnected = wa?.connected ?? false;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Connections</h1>
      <p className="mt-2 text-sm text-muted">
        Connect QuickBooks, email, and WhatsApp. Reminders send email first; WhatsApp follows a few
        hours later on steps 1–3.
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

      <div className="mt-8 space-y-4">
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">QuickBooks</p>
            <p className="text-sm text-muted">{qbConnected ? "Connected" : "Not connected"}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {qbConnected ? (
              <>
                <button
                  className="btn-secondary text-sm"
                  onClick={syncQb}
                  disabled={qbSyncing}
                >
                  {qbSyncing ? "Syncing…" : "Sync now"}
                </button>
                <button className="btn-secondary text-sm" onClick={disconnectQb}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="btn-secondary text-sm" onClick={connectQb}>
                Connect
              </button>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-sm text-muted">
                {emailReady ? `Ready via ${emailProvider}` : "Not connected"}
              </p>
            </div>
            {!emailReady && (
              <button className="btn-secondary text-sm shrink-0" onClick={connectGmail}>
                Connect Gmail
              </button>
            )}
          </div>
          {emailReady && emailProvider && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted mb-2">Send reminders via</p>
              <div className="flex gap-2">
                {(["google", "resend"] as const).map((p) => (
                  <button
                    key={p}
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
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs text-muted">Or verify a domain email via Resend</p>
              <input
                type="email"
                className="input"
                placeholder="you@yourdomain.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <button
                className="btn-secondary w-full text-sm"
                onClick={verifyResend}
                disabled={!resendEmail.trim()}
              >
                Send verification link
              </button>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">WhatsApp</p>
              <p className="text-sm text-muted">
                {!waEligible
                  ? `Requires Pro+ or Team (current: ${planLabel(user.plan)})`
                  : waConnected
                    ? wa?.mode === "own"
                      ? `Your number ${wa.phone ?? ""}${
                          wa.status === "pending"
                            ? " (enter phone + Login with Facebook)"
                            : wa.status === "registering"
                              ? " (registration in progress)"
                              : ""
                        }`
                      : "GentleTap business number"
                    : "Not connected"}
              </p>
            </div>
            {waConnected && (
              <button
                className="btn-secondary text-sm shrink-0"
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
              {wa?.shared_available && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Use GentleTap business number</p>
                  <p className="mt-1 text-xs text-muted">
                    Start in 2 minutes. Your name appears in the message. Clients reply to our verified
                    number.
                  </p>
                  <button
                    className="btn-secondary mt-3 text-sm"
                    onClick={connectShared}
                    disabled={waBusy}
                  >
                    Use shared number
                  </button>
                </div>
              )}

              <div className="rounded-lg border border-primary/40 p-4">
                <p className="text-sm font-medium">
                  Connect your business number <span className="text-primary">(recommended)</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Clients see your WhatsApp Business number. Requires Meta/Twilio sender registration.
                </p>
                <div className="mt-3 space-y-2">
                  <input
                    className="input w-full text-sm"
                    placeholder="+15551234567"
                    value={ownPhone}
                    onChange={(e) => setOwnPhone(e.target.value)}
                  />
                  {!wa?.embedded_signup?.configured && (
                    <>
                      {wa?.embedded_signup?.requires_meta_validation ? (
                        <>
                          <p className="text-xs text-muted">
                            WABA registration requires Login with Facebook. You can save your number as
                            pending until embedded signup is configured.
                          </p>
                          <button
                            className="btn-primary text-sm w-full"
                            onClick={connectOwn}
                            disabled={waBusy || !ownPhone.trim()}
                          >
                            Save number (pending)
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            className="input w-full text-sm"
                            placeholder="WABA ID (from Meta Business Manager)"
                            value={ownWaba}
                            onChange={(e) => setOwnWaba(e.target.value)}
                          />
                          <button
                            className="btn-primary text-sm w-full"
                            onClick={connectOwn}
                            disabled={waBusy || !ownPhone.trim()}
                          >
                            {ownWaba.trim() ? "Register number with Twilio" : "Save number (pending)"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {wa?.embedded_signup?.configured && (
                  <div className="mt-3">
                    <WhatsappEmbeddedSignup
                      config={wa.embedded_signup}
                      phoneE164={ownPhone}
                      disabled={waBusy}
                      onComplete={() => {
                        setWaError(null);
                        void loadStatus();
                      }}
                      onError={(msg) => setWaError(msg)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {waEligible && wa?.cap_reached && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium">Buy more WhatsApp messages</p>
              <p className="mt-1 text-xs text-muted">One-time packs add to your account.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => buyPack("pack_250")}
                  disabled={waBusy}
                >
                  +250 messages
                </button>
                <button
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

        {waConnected && inbound.length > 0 && (
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

export default function ConnectionsSettingsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center text-muted">Loading…</div>}>
      <ConnectionsSettingsContent />
    </Suspense>
  );
}
