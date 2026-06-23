"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { setBrowserCookie } from "@/lib/cookies";
import type { FarmSummary } from "@/lib/farm";
import { cn } from "@/lib/utils";

export function FarmSwitcher({
  farms,
  activeFarmId,
}: {
  farms: FarmSummary[];
  activeFarmId: string;
}) {
  const router = useRouter();
  const active = farms.find((f) => f.id === activeFarmId) ?? farms[0];

  function selectFarm(id: string) {
    if (id === active?.id) return;
    setBrowserCookie(ACTIVE_FARM_COOKIE, id);
    router.refresh();
  }

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent/60 focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2">
        <span className="flex size-5 items-center justify-center rounded bg-[var(--accent)]/15 text-[10px] font-bold text-[var(--accent)]">
          {active.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[140px] truncate font-medium">
          {active.name}
        </span>
        <span className="tnum text-text-tertiary text-[11px] uppercase">
          {active.state}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-text-tertiary text-[11px] tracking-wide uppercase">
          Your farms
        </DropdownMenuLabel>
        {farms.map((farm) => (
          <DropdownMenuItem
            key={farm.id}
            onSelect={() => selectFarm(farm.id)}
            className="gap-2"
          >
            <span className="flex flex-1 items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded bg-[var(--accent)]/15 text-[10px] font-bold text-[var(--accent)]">
                {farm.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{farm.name}</span>
              <span className="tnum text-text-tertiary text-[10px] uppercase">
                {farm.state}
              </span>
            </span>
            <Check
              className={cn(
                "size-4 text-[var(--accent)]",
                farm.id === active.id ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push("/onboarding?add=1")}
          className="text-muted-foreground gap-2"
        >
          <Plus className="size-4" />
          New farm
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
