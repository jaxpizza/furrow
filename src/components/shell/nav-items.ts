import {
  Activity,
  Bell,
  CloudSun,
  LayoutDashboard,
  Map,
  Newspaper,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Placeholder section (renders a "coming soon" empty state). */
  placeholder?: boolean;
};

/** Everyday tabs — what a farmer opens daily. Front and centre. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inputs", href: "/inputs", icon: Sprout },
  { label: "Weather", href: "/weather", icon: CloudSun },
];

/** Advanced tabs — the full depth, one tap away under "More" but not cluttering
 *  the everyday view. Nobody loses access; they're just de-emphasised. */
export const SECONDARY_NAV: NavItem[] = [
  { label: "Markets", href: "/markets", icon: TrendingUp },
  { label: "Terminal", href: "/terminal", icon: Activity },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Fields", href: "/fields", icon: Map },
];

/** All tabs, everyday first — for any consumer that wants the flat list. */
export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
