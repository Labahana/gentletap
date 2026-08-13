"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { PasswordRequirements } from "@/components/password-requirements";
import {
  applyAffiliate,
  type AffiliatePartnerType,
  type AffiliatePayoutMethod,
} from "@/lib/affiliate-auth";

const PARTNER_TYPE_OPTIONS: Array<{ value: AffiliatePartnerType; label: string }> = [
  { value: "creator", label: "Content creator (YouTube, newsletter, blog, course)" },
  { value: "accountant", label: "Accountant / bookkeeper (referring clients)" },
  { value: "other", label: "Other" },
];

const PAYOUT_METHOD_OPTIONS: Array<{ value: AffiliatePayoutMethod; label: string }> = [
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise" },
  { value: "bank_transfer", label: "Bank transfer (US/UK/EU)" },
];

function partnerTypeFromParam(raw: string | null): AffiliatePartnerType {
  if (raw === "accountant" || raw === "creator" || raw === "other") return raw;
  return "creator";
}

export function AffiliateApplyForm() {
  return (
    <Suspense fallback={<div className="card mt-8 p-6 text-sm text-muted">Loading application…</div>}>
      <AffiliateApplyFormInner />
    </Suspense>
  );
}

function AffiliateApplyFormInner() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    channel_name: "",
    channel_url: "",
    payout_email: "",
    payout_method: "paypal" as AffiliatePayoutMethod,
    payout_details: "",
    partner_type: partnerTypeFromParam(searchParams.get("path")),
    application_note: "",
  });
  const [agreedTerms, setAgreedTerms] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreedTerms) {
      setError("Please agree to the Affiliate Program Terms.");
      return;
    }
    setLoading(true);
    try {
      await applyAffiliate({
        email: form.email,
        password: form.password,
        name: form.name,
        channel_name: form.channel_name || undefined,
        channel_url: form.channel_url || undefined,
        payout_email: form.payout_email || undefined,
        payout_method: form.payout_method,
        payout_details: form.payout_details || undefined,
        partner_type: form.partner_type,
        application_note: form.application_note || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card mt-8">
        <p className="font-semibold text-green">Application received</p>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll review your channel and email you when approved. You can then log in to get your
          referral link.
        </p>
        <Link href="/affiliates/login" className="btn-secondary mt-6 inline-flex">
          Go to creator login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mt-8 space-y-4">
      <label className="block text-sm">
        I&apos;m applying as a…
        <select
          className="input mt-1"
          value={form.partner_type}
          onChange={(e) => setForm({ ...form, partner_type: e.target.value as AffiliatePartnerType })}
        >
          {PARTNER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Your name
        <input
          className="input mt-1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </label>
      <label className="block text-sm">
        Email (login + contact)
        <input
          type="email"
          className="input mt-1"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          className="input mt-1"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <PasswordRequirements password={form.password} />
      </label>
      <label className="block text-sm">
        Channel / brand name
        <input
          className="input mt-1"
          placeholder="e.g. Freelance Finance with Alex"
          value={form.channel_name}
          onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Channel URL
        <input
          type="url"
          className="input mt-1"
          placeholder="https://youtube.com/@..."
          value={form.channel_url}
          onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Payout method
        <select
          className="input mt-1"
          value={form.payout_method}
          onChange={(e) => setForm({ ...form, payout_method: e.target.value as AffiliatePayoutMethod })}
        >
          {PAYOUT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {form.payout_method === "paypal" ? "PayPal payout email" : "Payout email"}
        <input
          type="email"
          className="input mt-1"
          placeholder="Same as above if blank"
          value={form.payout_email}
          onChange={(e) => setForm({ ...form, payout_email: e.target.value })}
        />
      </label>
      {form.payout_method === "bank_transfer" && (
        <label className="block text-sm">
          Bank details (IBAN / account + routing)
          <textarea
            className="input mt-1 min-h-[60px]"
            placeholder="We use this only to send your payouts."
            value={form.payout_details}
            onChange={(e) => setForm({ ...form, payout_details: e.target.value })}
          />
        </label>
      )}
      <label className="block text-sm">
        Why is your audience a fit? (optional)
        <textarea
          className="input mt-1 min-h-[80px]"
          value={form.application_note}
          onChange={(e) => setForm({ ...form, application_note: e.target.value })}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreedTerms}
          onChange={(e) => setAgreedTerms(e.target.checked)}
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/affiliates/terms" className="text-accent hover:underline" target="_blank">
            Affiliate Program Terms
          </Link>{" "}
          and confirm my promotions will include proper affiliate disclosure.
        </span>
      </label>
      {error && <p className="text-sm text-red">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
