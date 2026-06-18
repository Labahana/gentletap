"use client";

import {
  IconBell,
  IconChartLine,
  IconCheck,
  IconHome,
  IconInfoCircle,
  IconLayoutDashboard,
  IconMail,
  IconPlug,
  IconRefresh,
  IconRobot,
  IconSettings,
  IconUsers,
  IconFileInvoice,
  IconBrandWhatsapp,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export type IconProps = { size?: number; className?: string; stroke?: number };

export const Icons = {
  overview: IconLayoutDashboard,
  home: IconHome,
  invoices: IconFileInvoice,
  clients: IconUsers,
  reminders: IconMail,
  analytics: IconChartLine,
  connections: IconPlug,
  settings: IconSettings,
  alerts: IconBell,
  robot: IconRobot,
  check: IconCheck,
  circleCheck: IconCircleCheck,
  whatsapp: IconBrandWhatsapp,
  mail: IconMail,
  refresh: IconRefresh,
  info: IconInfoCircle,
} as const satisfies Record<string, ComponentType<IconProps>>;

export function DashIcon({
  name,
  size = 18,
  className,
  stroke = 1.75,
}: {
  name: keyof typeof Icons;
  size?: number;
  className?: string;
  stroke?: number;
}) {
  const Comp = Icons[name];
  return <Comp size={size} className={className} stroke={stroke} />;
}
