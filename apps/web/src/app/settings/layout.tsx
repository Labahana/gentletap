import type { Metadata } from "next";

import { SettingsLayoutClient } from "@/components/settings/settings-layout-client";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>;
}
