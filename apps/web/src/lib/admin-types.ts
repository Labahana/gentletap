export type AdminOverview = {
  total_users: number;
  live_users: number;
  reminders_sent_today: number;
  pending_jobs: number;
  processing_jobs: number;
  stuck_jobs: number;
  failed_jobs: number;
  qb_connected: number;
  fb_connected: number;
  google_connected: number;
  active_sequences: number;
  recent_signups: AdminRecentSignup[];
};

export type AdminRecentSignup = {
  id: string;
  email: string;
  plan: string;
  onboarding_step: string;
  created_at: string | null;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  company_name: string | null;
  full_name: string | null;
  plan: string;
  onboarding_step: string;
  created_at: string | null;
  qb_connected: boolean;
  fb_connected: boolean;
  google_connected: boolean;
  last_sync_at: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  plan: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  timezone: string | null;
  created_at: string | null;
  delivery_ready: boolean;
  stats: {
    unpaid_invoices: number;
    active_sequences: number;
    reminders_sent: number;
  };
  quickbooks: {
    connected: boolean;
    realm_id: string | null;
    last_sync_at: string | null;
    token_expires_at: string | null;
    connected_at: string | null;
  } | null;
  freshbooks: {
    connected: boolean;
    account_id: string | null;
    business_name: string | null;
    last_sync_at: string | null;
    token_expires_at: string | null;
    connected_at: string | null;
  } | null;
  google: {
    connected: boolean;
    email: string | null;
    token_expires_at: string | null;
    connected_at: string | null;
  } | null;
  whatsapp: {
    connected: boolean;
    phone_e164: string | null;
    status: string | null;
    connected_at: string | null;
  } | null;
  recent_syncs: Array<{
    source?: string | null;
    status: string;
    message: string | null;
    invoices_synced: number | null;
    created_at: string | null;
  }>;
  recent_failed_jobs: Array<{
    job_id: string;
    invoice_id: string;
    doc_number: string | null;
    sequence_step: number;
    updated_at: string | null;
  }>;
};

export type AdminJob = {
  job_id: string;
  status: string;
  sequence_step: number;
  scheduled_for: string | null;
  updated_at: string | null;
  celery_task_id: string | null;
  invoice_id: string;
  doc_number: string | null;
  user_id: string;
  user_email: string;
  stuck: boolean;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  admin_email: string;
  target_user_id: string | null;
  target_email: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};
