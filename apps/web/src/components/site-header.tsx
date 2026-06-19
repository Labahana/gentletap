import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo height={28} />
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="text-muted hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary px-5 py-2.5">
            Try free
          </Link>
        </nav>
      </div>
    </header>
  );
}
