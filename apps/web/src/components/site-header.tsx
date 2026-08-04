import Link from "next/link";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/#product", label: "Product", hide: "hidden lg:inline" },
  { href: "/#how-it-works", label: "How it works", hide: "hidden md:inline" },
  { href: "/#integrations", label: "Integrations", hide: "hidden lg:inline" },
  { href: "/#pricing", label: "Pricing", hide: "hidden sm:inline" },
  { href: "/blog", label: "Resources", hide: "hidden xl:inline" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Logo height={28} />
        <nav className="flex items-center gap-4 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.hide} text-muted hover:text-foreground`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="text-muted hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary px-5 py-2.5">
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
