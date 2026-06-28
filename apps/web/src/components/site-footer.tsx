import Link from "next/link";
import { Logo } from "@/components/logo";
import { LEGAL } from "@/lib/legal";

const LEGAL_LINKS = [
  { href: "/quickbooks-payment-reminders", label: "QBO reminders" },
  {
    href: "/invoice-follow-up-email-templates-for-freelancers",
    label: "Invoice email templates",
  },
  { href: "/quickbooks-reminders-vs-gentletap", label: "QBO vs GentleTap" },
  { href: "/integrations/quickbooks", label: "QBO integration" },
  { href: "/affiliates", label: "Affiliate program" },
  { href: "/affiliates/terms", label: "Affiliate terms" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border py-8 text-center text-sm text-muted ${className}`}>
      <div className="mb-6 flex justify-center">
        <Logo height={28} href="/" />
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {LEGAL_LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-3">
            {i > 0 && <span aria-hidden className="text-border">·</span>}
            <Link href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
      <p className="mt-4">
        © {new Date().getFullYear()} {LEGAL.legalName} · {LEGAL.productName}
      </p>
    </footer>
  );
}
