"use client";

import { Logo } from "@/components/logo";

/** Centered logo for auth / onboarding shells */
export function AuthLogo({ className = "mb-8" }: { className?: string }) {
  return <Logo height={32} className={className} />;
}
