"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Map, MapPin } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function FieldSelector({
  fields,
  selected,
}: {
  fields: { id: string; name: string }[];
  selected: string; // "all" | fieldId
}) {
  const router = useRouter();
  const current =
    selected === "all"
      ? "All fields"
      : (fields.find((f) => f.id === selected)?.name ?? "All fields");

  function pick(value: string) {
    router.push(`/weather?field=${value}`, { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent/60 focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2">
        <MapPin className="size-4 text-[var(--accent)]" />
        <span className="max-w-[180px] truncate font-medium">{current}</span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-text-tertiary text-[11px] tracking-wide uppercase">
          Weather for
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => pick("all")} className="gap-2">
          <Map className="size-4" />
          <span className="flex-1">All fields</span>
          <Check
            className={cn(
              "size-4 text-[var(--accent)]",
              selected === "all" ? "opacity-100" : "opacity-0",
            )}
          />
        </DropdownMenuItem>
        {fields.length > 0 && <DropdownMenuSeparator />}
        {fields.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onSelect={() => pick(f.id)}
            className="gap-2"
          >
            <MapPin className="size-4" />
            <span className="flex-1 truncate">{f.name}</span>
            <Check
              className={cn(
                "size-4 text-[var(--accent)]",
                selected === f.id ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
