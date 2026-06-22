import Link from "next/link";
import { LEGAL } from "@/lib/legal";

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
  { href: "/contact", label: "Contact" },
] as const;

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted ${className}`}
      aria-label="Legal"
    >
      {LINKS.map((link, i) => (
        <span key={link.href} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-border">·</span>}
          <Link href={link.href} className="hover:text-foreground">
            {link.label}
          </Link>
        </span>
      ))}
      <span aria-hidden className="text-border">·</span>
      <span>© {new Date().getFullYear()} {LEGAL.legalName}</span>
    </nav>
  );
}
