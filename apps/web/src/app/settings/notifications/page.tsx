import Link from "next/link";

export default function NotificationsSettingsPage() {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          GentleTap notifies you in the dashboard when important events happen.
        </p>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="rounded-lg border border-border px-4 py-3">
          <p className="font-medium">Payment received</p>
          <p className="mt-0.5 text-muted">When QuickBooks shows an invoice as paid</p>
        </li>
        <li className="rounded-lg border border-border px-4 py-3">
          <p className="font-medium">Escalations</p>
          <p className="mt-0.5 text-muted">When a client is very overdue and may need a personal follow-up</p>
        </li>
        <li className="rounded-lg border border-border px-4 py-3">
          <p className="font-medium">Client replies</p>
          <p className="mt-0.5 text-muted">WhatsApp replies and payment claims from clients</p>
        </li>
      </ul>

      <p className="text-sm text-muted">
        View your notification history on the{" "}
        <Link href="/dashboard/alerts" className="font-medium text-accent hover:underline">
          Reminders sent
        </Link>{" "}
        page. Email notification preferences are coming soon.
      </p>
    </div>
  );
}
