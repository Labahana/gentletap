"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsShell } from "@/components/settings/settings-shell";
import { useAuth } from "@/lib/auth-context";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-8 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <SettingsShell>{children}</SettingsShell>
    </DashboardShell>
  );
}
