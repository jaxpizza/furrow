"use client";

import Link from "next/link";

import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const OPTIONS: { crop: Crop; label: string }[] = [
  { crop: "corn", label: "Corn" },
  { crop: "soybean", label: "Soybeans" },
];

export function CropToggle({ active }: { active: Crop }) {
  return (
    <div className="border-border bg-bg-elevated/60 inline-flex items-center gap-0.5 rounded-md border p-0.5">
      {OPTIONS.map((o) => (
        <Link
          key={o.crop}
          href={`/markets?crop=${o.crop}`}
          scroll={false}
          className={cn(
            "rounded px-3 py-1 text-sm font-medium transition-colors",
            active === o.crop
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "text-text-secondary hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
