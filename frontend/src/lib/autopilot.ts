/** Human-readable vocabulary for autopilot output (statuses, holds, tones). */

export const TONE_LABELS: Record<string, string> = {
  warm: 'Warm',
  friendly: 'Friendly',
  professional: 'Professional',
  firm: 'Firm',
  urgent: 'Final notice',
};

export const TONE_OPTIONS = ['warm', 'friendly', 'professional', 'firm', 'urgent'] as const;

export const STEP_TONE_OVERRIDES = [
  { value: 'auto', label: 'Auto (by stage)' },
  ...TONE_OPTIONS.map((t) => ({ value: t, label: TONE_LABELS[t] })),
];

const STATUS_LABELS: Record<string, { label: string; tone: 'done' | 'pending' | 'held' | 'skipped' }> = {
  sent: { label: 'Sent', tone: 'done' },
  pending: { label: 'Scheduled', tone: 'pending' },
  processing: { label: 'Sending…', tone: 'pending' },
  awaiting_approval: { label: 'Waiting for your review', tone: 'held' },
  skipped: { label: 'Skipped', tone: 'skipped' },
  cancelled: { label: 'Cancelled', tone: 'skipped' },
  failed: { label: 'Failed — will retry', tone: 'held' },
};

export function describeStatus(status: string): { label: string; tone: 'done' | 'pending' | 'held' | 'skipped' } {
  return STATUS_LABELS[status] ?? { label: status, tone: 'pending' };
}

const SKIP_REASONS: Record<string, string> = {
  paused: 'Autopilot paused',
  invoice_missing: 'Invoice no longer available',
  invoice_paid_or_stopped: 'Invoice was paid — chasing stopped',
  suppressed: 'Client opted out of email',
  opt_out: 'Client opted out',
  below_min_amount: 'Below your minimum chase amount',
  awaiting_expected_payment: 'Client promised payment — waiting for it to land',
  intel_client_responded: 'Client replied — holding off',
  intel_human_handoff_recommended: 'Escalated for a personal follow-up',
  max_attempts_stuck: 'Gave up after repeated delivery failures',
  approval_rejected: 'You rejected this reminder',
  first_batch: 'Waiting for your review (first reminder on this invoice)',
  amount_threshold: 'Waiting for your review (above your approval threshold)',
  unassigned: 'Sequence removed from this invoice',
};

export function describeHold(reason?: string | null): string | null {
  if (!reason) return null;
  return SKIP_REASONS[reason] ?? reason.replace(/_/g, ' ');
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function describeDayOffset(dayOffset: number): string {
  if (dayOffset === 0) return 'on the due date';
  if (dayOffset < 0) return `${Math.abs(dayOffset)} day${Math.abs(dayOffset) === 1 ? '' : 's'} before due`;
  return `${dayOffset} day${dayOffset === 1 ? '' : 's'} after due`;
}

export interface SequenceStep {
  day_offset: number;
  tone: string;
  template_id?: string | null;
  enabled?: boolean;
}

export interface AutopilotSequence {
  id: string;
  name: string;
  status: string;
  is_default?: boolean;
  auto_assign?: boolean;
  steps: SequenceStep[];
  stop_after_days?: number | null;
}

export interface AutopilotLastAction {
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface AutopilotNextSend {
  schedule_id: string;
  invoice_id: string;
  invoice_number?: string | null;
  client_name?: string | null;
  tone: string;
  channel: string;
  scheduled_at: string;
  step_index: number;
}

export interface AutopilotStatus {
  mode: 'template' | 'autopilot';
  active: boolean;
  paused: boolean;
  pause_until?: string | null;
  pause_reason?: string | null;
  active_sequences: number;
  pending_approvals: number;
  scheduled_reminders: number;
  sent_today: number;
  next_send?: AutopilotNextSend | null;
  last_action?: AutopilotLastAction | null;
  connected_sources: number;
  last_sync_at?: string | null;
  default_sequence?: AutopilotSequence | null;
  sequences: AutopilotSequence[];
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function timeUntil(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = then - Date.now();
  if (diff <= 0) return 'any moment now';
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}
