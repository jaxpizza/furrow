"use client";

import { useTransition } from "react";
import { Eye, LogOut } from "lucide-react";

import { stopImpersonation } from "@/app/(admin)/admin/users/actions";

/**
 * Persistent, high-visibility banner shown across the whole app whenever an admin
 * is viewing-as another user. It is NOT subtle on purpose — the admin must always
 * know they're looking at someone else's data, and exiting is one click away.
 */
export function ImpersonationBanner({ targetName, targetEmail }: { targetName: string | null; targetEmail: string | null }) {
  const [pending, start] = useTransition();
  const who = targetName || targetEmail || "another user";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-[var(--accent)] px-4 py-1.5 text-[13px] text-[#1b1403]">
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="size-4 shrink-0" />
        <span className="truncate">
          Viewing as <strong>{who}</strong>
          {targetEmail && targetName ? ` · ${targetEmail}` : ""} — <span className="font-semibold">admin support mode</span>
        </span>
      </span>
      <button
        onClick={() => start(() => stopImpersonation())}
        disabled={pending}
        className="flex shrink-0 items-center gap-1 rounded bg-[#1b1403]/15 px-2 py-0.5 font-semibold transition-colors hover:bg-[#1b1403]/25 disabled:opacity-60"
      >
        <LogOut className="size-3.5" />
        {pending ? "Exiting…" : "Exit view-as"}
      </button>
    </div>
  );
}
