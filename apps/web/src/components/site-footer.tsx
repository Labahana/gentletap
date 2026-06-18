import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border py-8 text-center text-sm text-muted ${className}`}>
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
      <p className="mt-4">© {new Date().getFullYear()} GentleTap</p>
    </footer>
  );
}
