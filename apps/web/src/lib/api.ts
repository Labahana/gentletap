// Browser: same-origin /v1 (proxied by Next.js) avoids mixed-content on HTTPS.
const API_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.API_PROXY_URL ?? "http://localhost:8000");

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  persona: string | null;
  plan: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
};

export type InvoiceItem = {
  id: string;
  doc_number: string | null;
  client_name: string;
  client_email: string | null;
  amount: number;
  balance: number;
  currency: string;
  days_overdue: number;
  status: string;
  sequence_active: boolean;
  sequence_paused: boolean;
  sequence_step: number;
  dispute_flag?: boolean;
  due_date: string | null;
};

export type ReminderPreviewItem = {
  invoice_id: string;
  doc_number: string | null;
  client_name: string;
  balance: number;
  days_overdue: number;
  status: string;
  reminder_id?: string;
  subject?: string;
  body?: string;
  tone?: string;
  channel?: string;
  whatsapp_followup?: boolean;
  error?: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      const retry = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
      if (!retry.ok) throw await parseError(retry);
      return retry.json() as Promise<T>;
    }
    clearToken();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

async function parseError(res: Response): Promise<Error> {
  const err = await res.json().catch(() => ({ detail: res.statusText }));
  const detail = err.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).join(", ")
        : "Request failed";
  return new Error(message);
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  register: (body: { email: string; password: string; full_name?: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  googleAuthUrl: (intent: "signup" | "login" = "signup") =>
    request<{ authorization_url: string }>(`/auth/google/url?intent=${intent}`),

  googleAuthExchange: (code: string) =>
    request<TokenResponse>("/auth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  logout: (refreshToken: string) =>
    request<{ status: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  onboardingStatus: (token: string) =>
    request<{ current_step: string; step_index: number; total_steps: number; completed: boolean }>(
      "/onboarding/status",
      {},
      token,
    ),

  setPersona: (token: string, persona: string) =>
    request<User>("/onboarding/persona", {
      method: "POST",
      body: JSON.stringify({ persona }),
    }, token),

  advanceOnboardingEmail: (token: string) =>
    request<{ current_step: string }>("/onboarding/advance-email", { method: "POST" }, token),

  qbConnectUrl: (token: string) =>
    request<{ authorization_url: string }>("/quickbooks/connect-url", {}, token),

  qbSyncStatus: (token: string) =>
    request<{
      status: string;
      progress: number;
      message: string;
      connected?: boolean;
      unpaid_count?: number;
      total_outstanding?: number;
    }>("/quickbooks/sync/status", {}, token),

  googleConnectUrl: (token: string) =>
    request<{ authorization_url: string }>("/google/connect-url", {}, token),

  emailStatus: (token: string) =>
    request<{ provider: string | null; ready: boolean; require_approval: boolean }>(
      "/email/status",
      {},
      token,
    ),

  verifyResendSender: (token: string, email: string) =>
    request<{ email: string; status: string; message: string }>(
      "/email/sender/verify",
      { method: "POST", body: JSON.stringify({ email }) },
      token,
    ),

  resendSenderStatus: (token: string) =>
    request<{ email?: string; verified: boolean; status?: string }>(
      "/email/sender/status",
      {},
      token,
    ),

  invoicesSummary: (token: string) =>
    request<{
      unpaid_count: number;
      overdue_count: number;
      total_outstanding: number;
      currency: string;
      green_count: number;
      yellow_count: number;
      red_count: number;
      active_sequences: number;
      monthly_collections: {
        monthly_limit: number;
        monthly_used: number;
        monthly_remaining: number;
        cap_reached: boolean;
      } | null;
    }>("/invoices/summary", {}, token),

  invoices: (token: string, status?: string) =>
    request<{ items: InvoiceItem[]; total: number }>(
      `/invoices${status ? `?status=${status}` : ""}`,
      {},
      token,
    ),

  remindersPreview: (token: string) =>
    request<{ items: ReminderPreviewItem[]; count: number }>("/reminders/preview", {}, token),

  updateReminder: (token: string, id: string, body: { subject?: string; body?: string }) =>
    request<{ id: string; subject: string; body: string }>(
      `/reminders/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
      token,
    ),

  approveAll: (token: string) =>
    request<{
      activated: number;
      message: string;
      skipped_escalation: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
      skipped_other: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
      plan_cap_total: number;
      plan_cap_remaining: number;
    }>("/reminders/approve-all", { method: "POST" }, token),

  approveInvoice: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/approve`, { method: "POST" }, token),

  markDispute: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/dispute`, { method: "POST" }, token),

  clearDispute: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/clear-dispute`, { method: "POST" }, token),

  qbSync: (token: string) =>
    request<{ status: string; message: string }>("/quickbooks/sync", { method: "POST" }, token),

  qbDisconnect: (token: string) =>
    request<{ status: string }>("/quickbooks/disconnect", { method: "POST" }, token),

  updateEmailPreferences: (token: string, send_provider: "google" | "resend") =>
    request<{ send_provider: string }>(
      "/email/preferences",
      { method: "PUT", body: JSON.stringify({ send_provider }) },
      token,
    ),

  pauseInvoice: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/pause`, { method: "POST" }, token),

  resumeInvoice: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/resume`, { method: "POST" }, token),

  invoiceDetail: (token: string, id: string) =>
    request<{
      id: string;
      doc_number: string | null;
      client: { name: string; email: string | null; phone: string | null };
      amount: number;
      balance: number;
      currency: string;
      days_overdue: number;
      status: string;
      sequence_active: boolean;
      sequence_paused: boolean;
      sequence_step: number;
      dispute_flag: boolean;
      due_date: string | null;
      client_claimed_paid_at: string | null;
      reminders: Array<{
        id: string;
        sequence_step: number;
        subject: string | null;
        body: string;
        status: string;
        sent_at: string | null;
        tone: string | null;
        channel: string;
      }>;
    }>(`/invoices/${id}`, {}, token),

  escalations: (token: string) =>
    request<{
      items: Array<{
        invoice_id: string;
        doc_number: string | null;
        client_name: string;
        balance: number;
        days_overdue: number;
        recommendation: string;
      }>;
    }>("/escalations", {}, token),

  markNotificationRead: (token: string, id: string) =>
    request<{ read: boolean }>(`/notifications/${id}/read`, { method: "POST" }, token),

  notifications: (token: string) =>
    request<{
      items: Array<{
        id: string;
        kind: string;
        title: string;
        body: string;
        invoice_id: string | null;
        read: boolean;
      }>;
    }>(
      "/notifications",
      {},
      token,
    ),

  billingStatus: (token: string) =>
    request<{
      plan: string;
      plan_display_name: string;
      checkout_available: boolean;
      plans: import("@/lib/pricing").PlanFeature[];
    }>("/billing/status", {}, token),

  billingCheckout: (
    token: string,
    plan: "pro" | "pro_plus" | "team",
    interval: "month" | "year" = "month",
  ) =>
    request<{ checkout_url: string }>(
      "/billing/checkout",
      { method: "POST", body: JSON.stringify({ plan, interval }) },
      token,
    ),

  billingPortal: (token: string) =>
    request<{ portal_url: string }>("/billing/portal", {}, token),

  whatsappStatus: (token: string) =>
    request<{
      plan_eligible: boolean;
      connected: boolean;
      mode: string | null;
      phone: string | null;
      status: string | null;
      platform_configured: boolean;
      shared_available: boolean;
      monthly_limit: number;
      monthly_used: number;
      monthly_remaining: number;
      extra_credits: number;
      total_remaining: number;
      cap_reached: boolean;
      embedded_signup?: {
        configured: boolean;
        app_id: string | null;
        config_id: string | null;
        solution_id: string | null;
        sdk_version: string;
        feature_type: string;
        requires_meta_validation?: boolean;
      };
    }>("/whatsapp/status", {}, token),

  whatsappConnectShared: (token: string) =>
    request<{ connected: boolean; mode: string; message: string }>(
      "/whatsapp/connect/shared",
      { method: "POST" },
      token,
    ),

  whatsappConnectOwn: (
    token: string,
    phone_e164: string,
    waba_id?: string,
    meta_code?: string,
    meta_phone_number_id?: string,
  ) =>
    request<{ connected: boolean; mode: string; phone: string; status: string; message: string }>(
      "/whatsapp/connect/own",
      {
        method: "POST",
        body: JSON.stringify({
          phone_e164,
          waba_id: waba_id || null,
          meta_code: meta_code || null,
          meta_phone_number_id: meta_phone_number_id || null,
        }),
      },
      token,
    ),

  whatsappDisconnect: (token: string) =>
    request<{ connected: boolean }>("/whatsapp/disconnect", { method: "POST" }, token),

  whatsappCheckoutMessages: (token: string, pack: "pack_250" | "pack_500") =>
    request<{ checkout_url: string }>(
      "/whatsapp/checkout-messages",
      { method: "POST", body: JSON.stringify({ pack }) },
      token,
    ),

  whatsappEmbeddedSignupComplete: (
    token: string,
    body: { waba_id: string; phone_e164: string; meta_phone_number_id?: string; meta_code?: string },
  ) =>
    request<{
      connected: boolean;
      mode: string;
      phone: string;
      status: string;
      message: string;
    }>("/whatsapp/embedded-signup/complete", { method: "POST", body: JSON.stringify(body) }, token),

  whatsappInbound: (token: string) =>
    request<{
      items: Array<{
        id: string;
        from_phone: string;
        body: string;
        invoice_id: string | null;
        created_at: string | null;
      }>;
    }>("/whatsapp/inbound", {}, token),
};

export const TOKEN_KEY = "gentletap_token";
export const REFRESH_KEY = "gentletap_refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string | null) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenResponse;
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}
