/**
 * Single source of truth for plan feature lists (Landing + Billing).
 * Every tier lists its FULL cumulative feature set — value stacking — with
 * upgraded limits replacing the lower-tier value and `isNew` marking what
 * the tier adds.
 */

export interface PlanFeature {
  label: string;
  isNew?: boolean;
}

export const PLAN_INTROS: Record<string, string> = {
  pro: 'Everything in Starter, and:',
  pro_plus: 'Everything in Pro, and:',
  team: 'Everything in Pro+, and:',
};

export const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  starter: [
    { label: '5 collections / month' },
    { label: '1 seat' },
    { label: 'Email reminders from your Gmail' },
    { label: 'QuickBooks + FreshBooks sync' },
    { label: 'AI drafts in your voice' },
    { label: 'Pause & quiet hours' },
    { label: 'CSV invoice import' },
  ],
  pro: [
    { label: 'Unlimited collections', isNew: true },
    { label: 'Autopilot control center', isNew: true },
    { label: 'Client payment profiles', isNew: true },
    { label: 'Escalation rules & alerts', isNew: true },
    { label: 'Priority AI drafting', isNew: true },
    { label: '1 seat' },
    { label: 'Email reminders from your Gmail' },
    { label: 'QuickBooks + FreshBooks sync' },
    { label: 'AI drafts in your voice' },
    { label: 'Pause & quiet hours' },
    { label: 'CSV invoice import' },
  ],
  pro_plus: [
    { label: '450 WhatsApp reminders / mo', isNew: true },
    { label: 'WhatsApp quiet hours & smart timing', isNew: true },
    { label: 'Advanced analytics', isNew: true },
    { label: 'Top-up credit packs', isNew: true },
    { label: 'Unlimited collections' },
    { label: 'Autopilot control center' },
    { label: 'Client payment profiles' },
    { label: 'Escalation rules & alerts' },
    { label: 'Priority AI drafting' },
    { label: '1 seat' },
    { label: 'Email reminders from your Gmail' },
    { label: 'QuickBooks + FreshBooks sync' },
    { label: 'AI drafts in your voice' },
    { label: 'Pause & quiet hours' },
    { label: 'CSV invoice import' },
  ],
  team: [
    { label: '850 WhatsApp reminders / mo', isNew: true },
    { label: '3 seats included', isNew: true },
    { label: 'Roles & audit log', isNew: true },
    { label: 'Shared team dashboard', isNew: true },
    { label: 'WhatsApp quiet hours & smart timing' },
    { label: 'Advanced analytics' },
    { label: 'Top-up credit packs' },
    { label: 'Unlimited collections' },
    { label: 'Autopilot control center' },
    { label: 'Client payment profiles' },
    { label: 'Escalation rules & alerts' },
    { label: 'Priority AI drafting' },
    { label: 'Email reminders from your Gmail' },
    { label: 'QuickBooks + FreshBooks sync' },
    { label: 'AI drafts in your voice' },
    { label: 'Pause & quiet hours' },
    { label: 'CSV invoice import' },
  ],
};
