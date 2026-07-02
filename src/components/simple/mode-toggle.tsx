"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";

import { setAppMode } from "@/lib/mode-action";
import { MODE_HOME, type AppMode } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

/**
 * Switch between the calm Simple screen and the full app. `current` is the surface
 * this toggle sits on — clicking it saves the OTHER mode as the user's preference
 * and navigates there. Persisted server-side, so the choice sticks next visit.
 */
export function ModeToggle({
  current,
  className,
}: {
  current: AppMode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const target: AppMode = current === "simple" ? "full" : "simple";
  const label = current === "simple" ? "Detailed view" : "Simple view";

  function go() {
    start(async () => {
      // Persist the preference, but never let a write hiccup block the switch.
      await setAppMode(target).catch(() => {});
      router.push(MODE_HOME[target]);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      aria-label={`Switch to ${label}`}
      className={cn(
        "border-border text-text-secondary hover:text-foreground hover:border-[var(--accent)]/40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowLeftRight className="size-3.5" />}
      {label}
    </button>
  );
}
