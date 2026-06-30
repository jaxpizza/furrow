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

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Fields", href: "/fields", icon: Map },
  { label: "Markets", href: "/markets", icon: TrendingUp },
  { label: "Terminal", href: "/terminal", icon: Activity },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Weather", href: "/weather", icon: CloudSun },
  { label: "Inputs", href: "/inputs", icon: Sprout, placeholder: true },
  { label: "News", href: "/news", icon: Newspaper, placeholder: true },
];
