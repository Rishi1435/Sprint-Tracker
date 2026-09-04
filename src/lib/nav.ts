import type { IconName } from "@/components/Icon";

/** Primary destinations, shared by the desktop header pills and the mobile tab bar. */
export interface NavItem {
  href: string;
  label: string;
  /** Short label for the cramped mobile tab bar. */
  short: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My plan", short: "Plan", icon: "list" },
  { href: "/squad", label: "Squad", short: "Squad", icon: "users" },
  { href: "/insights", label: "Insights", short: "Insights", icon: "chart" },
];
