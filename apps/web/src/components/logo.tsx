import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** full = icon + GentleTap wordmark; mark = icon only (favicon, OAuth) */
  variant?: "full" | "mark";
  /** Smaller wordmark for narrow sidebars */
  compact?: boolean;
  href?: string;
  className?: string;
  /** Height of the icon mark in px */
  height?: number;
};

function LogoMark({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-mark-transparent.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

function LogoWordmark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={`font-bold tracking-tight text-foreground ${compact ? "text-sm" : ""} ${className}`}
    >
      Gentle<span className="text-accent">Tap</span>
    </span>
  );
}

export function Logo({
  variant = "full",
  compact = false,
  href = "/",
  className = "",
  height = 32,
}: LogoProps) {
  const markSize = variant === "full" ? Math.round(height * 0.92) : height;
  const textClass = compact ? "" : height >= 28 ? "text-xl" : "text-lg";

  const content =
    variant === "mark" ? (
      <LogoMark size={markSize} />
    ) : (
      <span className={`inline-flex items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
        <LogoMark size={markSize} />
        <LogoWordmark className={textClass} compact={compact} />
      </span>
    );

  if (!href) {
    return <span className={`inline-flex shrink-0 items-center ${className}`}>{content}</span>;
  }

  return (
    <Link href={href} className={`inline-flex shrink-0 items-center ${className}`} aria-label="GentleTap home">
      {content}
    </Link>
  );
}
