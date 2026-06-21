// Browser: same-origin /v1 (proxied by Next.js) avoids mixed-content on HTTPS.
const API_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.API_PROXY_URL ?? "http://localhost:8000");

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  email_display_name: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
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

export type EmailDnsRecord = {
  type: string;
  host: string;
  value: string;
  priority?: number | null;
};

export type EmailSetupInfo = {
  provider: string | null;
  ready: boolean;
  platform_available: boolean;
  platform_from: string | null;
  platform_reply_to: string;
  domain_from_preview: string;
  google_connected: boolean;
  google_email: string | null;
  domain: {
    domain: string;
    status: string;
    verified: boolean;
    records: EmailDnsRecord[];
  } | null;
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
  chase_label?: "chasing" | "final_notice" | "paid" | "paused" | "disputed" | "queued" | "upcoming";
  status_text?: string;
  meta_line?: string;
  last_reminder_at?: string | null;
  last_reminder_channel?: string | null;
};

export type DashboardActivity = {
  kind: string;
  channel?: string | null;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  amount?: number | null;
  at: string;
  invoice_id?: string | null;
};

export type DashboardSummary = {
  unpaid_count: number;
  overdue_count: number;
  total_outstanding: number;
  currency: string;
  green_count: number;
  yellow_count: number;
  red_count: number;
  active_sequences: number;
  collected_this_month?: number;
  expected_this_week?: number;
  expected_this_week_count?: number;
  avg_days_to_pay?: number | null;
  reminders_sent_this_month?: number;
  collection_rate?: number;
  response_rate?: number | null;
  time_saved_hours?: number;
  time_saved_value?: number;
  featured_escalation?: {
    invoice_id: string;
    client_name: string;
    balance: number;
    currency: string;
    reminders_sent: number;
    days_overdue: number;
    message: string;
  } | null;
  last_action?: {
    channel: string;
    client_name: string;
    doc_number: string | null;
    sent_at: string | null;
  } | null;
  activity?: DashboardActivity[];
  monthly_collections: {
    monthly_limit: number;
    monthly_used: number;
    monthly_remaining: number;
    cap_reached: boolean;
  } | null;
  aging?: {
    current: { count: number; total: number };
    days_1_30: { count: number; total: number };
    days_31_60: { count: number; total: number };
    days_61_90: { count: number; total: number };
    days_90_plus: { count: number; total: number };
  };
  collected_mom_pct?: number | null;
  collected_last_month?: number;
  avg_days_delta?: number | null;
  avg_days_last_month?: number | null;
};

export type ClientListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  risk_level: string;
  avg_days_to_pay: number | null;
  late_payment_rate: number;
  lifetime_value: number;
  tenure_months: number;
  preferred_channel: string;
  email_suppressed: boolean;
  outstanding: number;
  unpaid_count: number;
  active_chase_count: number;
};

export type ClientDetail = ClientListItem & {
  communication_style: string;
  invoices_paid_on_time: number;
  invoices_paid_late: number;
  invoices: Array<{
    id: string;
    doc_number: string | null;
    amount: number;
    balance: number;
    currency: string;
    days_overdue: number;
    status: string;
    sequence_active: boolean;
    due_date: string | null;
  }>;
};

export type AnalyticsData = {
  currency: string;
  total_clients: number;
  active_sequences: number;
  reminders_sent_this_month: number;
  paid_this_month: number;
  response_rate: number | null;
  collection_trend: Array<{ month: string; year: number; collected: number }>;
  reminders_by_channel: Record<string, number>;
  clients_by_risk: { low: number; medium: number; high: number };
  top_clients_outstanding: Array<{ id: string; name: string; outstanding: number }>;
  avg_days_to_pay?: number | null;
  collected_mom_pct: number | null;
  collected_last_month: number;
  avg_days_delta: number | null;
  avg_days_last_month: number | null;
};

export type ReminderPreviewItem = {
  invoice_id: string;
  doc_number: string | null;
  client_name: string;
  client_email?: string | null;
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

export type ReminderPreviewSummary = {
  overdue_count: number;
  total_outstanding: number;
  oldest_days_overdue: number;
  avg_days_overdue: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

  saveOnboardingProfile: (
    token: string,
    body: {
      company_name: string;
      email_display_name?: string;
      phone?: string;
      website?: string;
      logo_url?: string | null;
    },
  ) =>
    request<User>("/onboarding/profile", {
      method: "POST",
      body: JSON.stringify(body),
    }, token),

  advanceOnboardingQuickbooks: (token: string) =>
    request<{ current_step: string }>("/onboarding/advance-quickbooks", { method: "POST" }, token),

  advanceOnboardingImport: (token: string) =>
    request<{ current_step: string }>("/onboarding/advance-import", { method: "POST" }, token),

  importInvoicesCsv: (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      imported: number;
      skipped: number;
      total_outstanding: number;
      columns_found: string[];
    }>("/invoices/import", { method: "POST", body: form }, token);
  },

  advanceOnboardingEmail: (token: string) =>
    request<{ current_step: string }>("/onboarding/advance-email", { method: "POST" }, token),

  advanceOnboardingPricing: (token: string) =>
    request<{ current_step: string }>("/onboarding/advance-pricing", { method: "POST" }, token),

  onboardingActivate: (token: string) =>
    request<{
      activated: number;
      message: string;
      skipped_escalation: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
      skipped_other: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
      plan_cap_total: number;
      plan_cap_remaining: number;
    }>("/onboarding/activate", { method: "POST" }, token),

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
      last_sync_at?: string | null;
      auto_activated?: number;
    }>("/quickbooks/sync/status", {}, token),

  googleConnectUrl: (token: string, returnTo: "onboarding" | "settings" = "onboarding") =>
    request<{ authorization_url: string }>(
      `/google/connect-url?return_to=${returnTo}`,
      {},
      token,
    ),

  googleStatus: (token: string) =>
    request<{ connected: boolean; email?: string }>("/google/status", {}, token),

  googleDisconnect: (token: string) =>
    request<{ status: string }>("/google/disconnect", { method: "POST" }, token),

  emailStatus: (token: string) =>
    request<{ provider: string | null; ready: boolean; require_approval: boolean }>(
      "/email/status",
      {},
      token,
    ),

  emailSetup: (token: string) => request<EmailSetupInfo>("/email/setup", {}, token),

  enablePlatformEmail: (token: string) =>
    request<{ provider: string; from: string; reply_to: string }>("/email/platform", { method: "POST" }, token),

  startEmailDomain: (token: string, domain_or_email: string) =>
    request<{ domain: string; status: string; records: EmailDnsRecord[] }>(
      "/email/domain",
      { method: "POST", body: JSON.stringify({ domain_or_email }) },
      token,
    ),

  verifyEmailDomain: (token: string) =>
    request<{ domain: string; status: string; verified: boolean; records: EmailDnsRecord[] }>(
      "/email/domain/verify",
      { method: "POST" },
      token,
    ),

  continueEmailDomain: (token: string) =>
    request<{ provider: string; domain: string; status: string }>(
      "/email/domain/continue",
      { method: "POST" },
      token,
    ),

  cancelEmailDomain: (token: string) =>
    request<{ status: string }>("/email/domain", { method: "DELETE" }, token),

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
    request<DashboardSummary>("/invoices/summary", {}, token),

  invoices: (token: string, status?: string) =>
    request<{ items: InvoiceItem[]; total: number }>(
      `/invoices${status ? `?status=${status}` : ""}`,
      {},
      token,
    ),

  clients: (token: string) =>
    request<{ items: ClientListItem[]; total: number }>("/clients", {}, token),

  clientDetail: (token: string, id: string) =>
    request<ClientDetail>(`/clients/${id}`, {}, token),

  analytics: (token: string) => request<AnalyticsData>("/analytics", {}, token),

  remindersPreview: (token: string) =>
    request<{ items: ReminderPreviewItem[]; count: number; summary: ReminderPreviewSummary }>(
      "/reminders/preview",
      {},
      token,
    ),

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
        created_at?: string | null;
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
    returnTo: "billing" | "onboarding" = "billing",
  ) =>
    request<{ checkout_url: string }>(
      "/billing/checkout",
      { method: "POST", body: JSON.stringify({ plan, interval, return_to: returnTo }) },
      token,
    ),

  billingPortal: (token: string) =>
    request<{ portal_url: string }>("/billing/portal", {}, token),

  whatsappStatus: (token: string) =>
    request<{
      plan_eligible: boolean;
      connected: boolean;
      mode: string | null;
      status: string | null;
      platform_configured: boolean;
      shared_available: boolean;
      shared_sender: string | null;
      monthly_limit: number;
      monthly_used: number;
      monthly_remaining: number;
      extra_credits: number;
      total_remaining: number;
      cap_reached: boolean;
    }>("/whatsapp/status", {}, token),

  whatsappConnectShared: (token: string) =>
    request<{ connected: boolean; mode: string; message: string }>(
      "/whatsapp/connect/shared",
      { method: "POST" },
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

  updateProfile: (token: string, body: { full_name?: string; persona?: string }) =>
    request<{
      id: string;
      email: string;
      full_name: string | null;
      persona: string | null;
      plan: string;
      onboarding_step: string;
      onboarding_completed_at: string | null;
    }>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }, token),

  changePassword: (token: string, password: string) =>
    request<{ message: string }>(
      "/auth/change-password",
      { method: "POST", body: JSON.stringify({ password }) },
      token,
    ),

  exportAccountData: async (token: string) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/v1/auth/me/export`, { headers });
    if (!res.ok) throw await parseError(res);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gentletap-data-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  deleteAccount: (token: string, confirmation: string) =>
    request<{ message: string }>(
      "/auth/delete-account",
      { method: "POST", body: JSON.stringify({ confirmation }) },
      token,
    ),
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
