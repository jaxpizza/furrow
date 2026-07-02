"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutList, LogOut, Menu, X } from "lucide-react";

import { FurrowLogo } from "@/components/brand/logo";
import type { FarmSummary } from "@/lib/farm";
import { createClient } from "@/lib/supabase/client";
import { setAppMode } from "@/lib/mode-action";
import { cn } from "@/lib/utils";

import { FarmSwitcher } from "./farm-switcher";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

/**
 * Mobile navigation — the small-screen counterpart to the desktop sidebar, which
 * is hidden below md. A hamburger opens a slide-in drawer with every tab, the
 * farm switcher, and sign-out; it closes on selection, tap-away, or Escape. The
 * whole thing is md:hidden so the desktop sidebar is untouched.
 */
export function MobileNav({
  farms,
  activeFarmId,
  unreadAlerts = 0,
}: {
  farms: FarmSummary[];
  activeFarmId: string;
  unreadAlerts?: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Each nav link, the logo, and sign-out close the drawer on tap (the latter two
  // navigate out of the app shell, which unmounts this entirely). Escape + tap-away
  // cover the rest.
  // Escape to close + lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  async function switchToSimple() {
    setOpen(false);
    await setAppMode("simple").catch(() => {});
    router.push("/today");
    router.refresh();
  }

  const navLink = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-accent/70 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        )}
      >
        <Icon className={cn("size-4", active ? "text-[var(--accent)]" : "text-muted-foreground")} strokeWidth={2} />
        {item.label}
        {item.href === "/alerts" && unreadAlerts > 0 && (
          <span className="tnum ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[#1b1403]">
            {unreadAlerts > 99 ? "99+" : unreadAlerts}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/60 focus-visible:ring-ring/50 -ml-1 flex size-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 md:hidden"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>

      {/* Portal to <body> so the overlay escapes the TopBar header — that header
          has backdrop-blur (a backdrop-filter), which would otherwise become the
          containing block for this fixed element and clip it to the header. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
            {/* tap-away backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            />

            {/* drawer panel */}
            <motion.div
              className="bg-sidebar border-border/80 absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <div className="border-border/80 flex h-14 items-center justify-between border-b px-4">
                <Link href="/dashboard" className="outline-none" onClick={() => setOpen(false)}>
                  <FurrowLogo />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex size-8 items-center justify-center rounded-md transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="border-border/80 border-b p-3">
                <FarmSwitcher farms={farms} activeFarmId={activeFarmId} />
              </div>

              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
                {PRIMARY_NAV.map(navLink)}
                <div className="text-text-tertiary mt-4 mb-1 px-3 text-[10px] font-medium tracking-wide uppercase">
                  More
                </div>
                {SECONDARY_NAV.map(navLink)}
              </nav>

              <div className="border-border/80 space-y-0.5 border-t p-3">
                <button
                  type="button"
                  onClick={switchToSimple}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <LayoutList className="size-4" />
                  Simple view
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
