import {
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
  /** Phase-1 placeholder section (renders an empty state). */
  placeholder?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Fields", href: "/fields", icon: Map, placeholder: true },
  { label: "Markets", href: "/markets", icon: TrendingUp, placeholder: true },
  { label: "Inputs", href: "/inputs", icon: Sprout, placeholder: true },
  { label: "News", href: "/news", icon: Newspaper, placeholder: true },
];
