/** Primary destinations, shared by the desktop header pills and the mobile tab bar. */
export interface NavItem {
  href: string;
  label: string;
  /** Short label for the cramped mobile tab bar. */
  short: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My Plan", short: "Plan", icon: "📋" },
  { href: "/squad", label: "Squad", short: "Squad", icon: "🏆" },
  { href: "/insights", label: "Insights", short: "Insights", icon: "📊" },
];
