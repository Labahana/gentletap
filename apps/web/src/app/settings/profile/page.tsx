"use client";

import { useEffect, useState } from "react";
import { YourPlanCard } from "@/components/settings/your-plan-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PERSONAS = [
  { id: "freelancer", label: "Freelancer", icon: "💻", desc: "Independent contractor or solo worker" },
  { id: "consultant", label: "Consultant", icon: "📊", desc: "Advisory or professional services" },
  { id: "agency", label: "Agency", icon: "🏢", desc: "Team managing multiple clients" },
];

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:gap-8">
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [monthlyUsed, setMonthlyUsed] = useState<number | undefined>();
  const [monthlyLimit, setMonthlyLimit] = useState<number | undefined>();

  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(() => {
      setFullName(user.full_name ?? "");
      setPersona(user.persona ?? null);
      setCompanyName(user.company_name ?? "");
      setDisplayName(user.email_display_name ?? "");
      setPhone(user.phone ?? "");
      setWebsite(user.website ?? "");
      setTimezone(user.timezone ?? "America/New_York");
    });
  }, [user]);

  useEffect(() => {
    api.invoicesSummary().then((s) => {
      setMonthlyUsed(s.monthly_collections?.monthly_used);
      setMonthlyLimit(s.monthly_collections?.monthly_limit);
    });
  }, [user]);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await api.updateProfile({
        full_name: fullName,
        persona: persona ?? undefined,
        company_name: companyName,
        email_display_name: displayName,
        phone,
        website,
        timezone,
      });
      await refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <YourPlanCard plan={user.plan} monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit} />

      <div className="card">
        <h2 className="font-semibold">Profile Information</h2>
        <form onSubmit={saveProfile} className="mt-4 divide-y divide-border">
          <SettingRow label="Full name" desc="Used in emails sent from GentleTap">
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </SettingRow>

          <SettingRow label="Email" desc="Your sign-in email — contact support to change">
            <input className="input cursor-not-allowed opacity-60" value={user.email} readOnly />
          </SettingRow>

          <SettingRow label="Company" desc="Shown on invoices and reminder context">
            <input
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Studio"
            />
          </SettingRow>

          <SettingRow label="Sender name" desc="The name clients see in the From line">
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex from Acme"
            />
          </SettingRow>

          <SettingRow label="Phone" desc="Optional — used in signature context">
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0100"
            />
          </SettingRow>

          <SettingRow label="Website" desc="Optional">
            <input
              className="input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.studio"
            />
          </SettingRow>

          <SettingRow label="Timezone" desc="Send windows and WhatsApp timing use this">
            <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "America/Toronto",
                "Europe/London",
                "Europe/Berlin",
                "Europe/Paris",
                "Asia/Dubai",
                "Asia/Singapore",
                "Australia/Sydney",
                "UTC",
              ].map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="I work as…" desc="Helps us personalise reminder tone and templates">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    persona === p.id
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border hover:border-accent/40 hover:bg-background"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <p className="mt-1.5 text-sm font-medium">{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
                </button>
              ))}
            </div>
          </SettingRow>

          {profileError && (
            <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{profileError}</p>
          )}
          <div className="flex items-center gap-4 pt-4">
            <button type="submit" disabled={profileSaving} className="btn-primary py-2 text-sm disabled:opacity-60">
              {profileSaving ? "Saving…" : "Save changes"}
            </button>
            {profileSaved && <p className="text-sm text-green">✓ Saved</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
