"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { FurrowLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar border-border/80 hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="border-border/80 flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="outline-none">
          <FurrowLogo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="bg-accent/70 absolute inset-0 rounded-md"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative flex items-center gap-3">
                <Icon
                  className={cn(
                    "size-4 transition-colors",
                    active
                      ? "text-[var(--accent)]"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={2}
                />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="text-text-tertiary border-border/80 border-t px-5 py-3 text-[11px]">
        <span className="tnum">Phase 1</span> · Foundation
      </div>
    </aside>
  );
}
