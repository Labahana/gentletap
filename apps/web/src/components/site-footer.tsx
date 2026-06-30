import Link from "next/link";
import { Logo } from "@/components/logo";
import { LEGAL } from "@/lib/legal";

const FOOTER_SECTIONS = [
  {
    title: "Resources",
    links: [
      { href: "/how-to-follow-up-on-overdue-invoices", label: "Overdue invoice guide" },
      { href: "/quickbooks-payment-reminders", label: "QBO payment reminders" },
      {
        href: "/invoice-follow-up-email-templates-for-freelancers",
        label: "Invoice email templates",
      },
      { href: "/quickbooks-reminders-vs-gentletap", label: "QBO vs GentleTap" },
      { href: "/integrations/quickbooks", label: "QuickBooks integration" },
      { href: "/llms.txt", label: "AI / LLM site summary" },
    ],
  },
  {
    title: "Partners",
    links: [
      { href: "/affiliates", label: "Affiliate program" },
      { href: "/affiliates/terms", label: "Affiliate terms" },
      { href: "/affiliates/login", label: "Creator login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/refund", label: "Refund Policy" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
] as const;

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border py-10 text-sm text-muted ${className}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex justify-center sm:justify-start">
          <Logo height={28} href="/" />
        </div>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-labelledby={`footer-${section.title.toLowerCase()}`}>
              <h2
                id={`footer-${section.title.toLowerCase()}`}
                className="text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <Link href="/contact" className="hover:text-foreground">
            Contact support
          </Link>
          <p>
            © {new Date().getFullYear()} {LEGAL.legalName} · {LEGAL.productName}
          </p>
        </div>
      </div>
    </footer>
  );
}
