"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { FurrowLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

export function AppSidebar({ unreadAlerts = 0 }: { unreadAlerts?: number }) {
  const pathname = usePathname();

  const link = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-active"
            className="bg-accent/70 absolute inset-0 rounded-md"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        <span className="relative flex flex-1 items-center gap-3">
          <Icon
            className={cn(
              "size-4 transition-colors",
              active ? "text-[var(--accent)]" : "text-muted-foreground group-hover:text-foreground",
            )}
            strokeWidth={2}
          />
          {item.label}
          {item.href === "/alerts" && unreadAlerts > 0 && (
            <span className="tnum ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[#1b1403]">
              {unreadAlerts > 99 ? "99+" : unreadAlerts}
            </span>
          )}
        </span>
      </Link>
    );
  };

  return (
    <aside className="bg-sidebar border-border/80 hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="border-border/80 flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="outline-none">
          <FurrowLogo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {PRIMARY_NAV.map(link)}

        <div className="text-text-tertiary mt-4 mb-1 px-3 text-[10px] font-medium tracking-wide uppercase">
          More
        </div>
        {SECONDARY_NAV.map(link)}
      </nav>

      <div className="text-text-tertiary border-border/80 border-t px-5 py-3 text-[11px]">
        <span className="tnum">Phase 1</span> · Foundation
      </div>
    </aside>
  );
}
