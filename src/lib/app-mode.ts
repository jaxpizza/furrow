import type { Crop } from "@/lib/types/database";

/**
 * Furrow has two front doors:
 *  - "simple" — a calm, one-screen glance (today's price, the trend, a plain read,
 *    what's moving the market, and an OPTIONAL break-even). The default.
 *  - "full"   — the entire app (dashboard, inputs, terminal, weather, fields…).
 *
 * The choice is a per-user preference stored on `profiles.app_mode`, so it sticks
 * across sessions and devices. Both surfaces sit over the SAME backend.
 */
export type AppMode = "simple" | "full";

type MaybeProfile = { app_mode?: string | null } | null | undefined;

/**
 * Resolve a user's mode from their profile. Defaults to "simple" — the calm screen
 * is the default experience. (Before the 0020 migration is applied the column is
 * absent, so this reads `undefined` and safely falls back to simple.)
 */
export function resolveAppMode(profile: MaybeProfile): AppMode {
  return profile?.app_mode === "full" ? "full" : "simple";
}

/** Where each mode lives. */
export const MODE_HOME: Record<AppMode, string> = {
  simple: "/today",
  full: "/dashboard",
};

/**
 * Typical central-Illinois ballpark costs, pre-filled into the optional break-even
 * so a farmer starts from a sensible number he can nudge to his own — never from a
 * blank field. (~$4.00/bu corn, ~$9.17/bu soybeans.)
 */
export const BREAKEVEN_PREFILL: Record<Crop, { costPerAcre: number; expectedYield: number }> = {
  corn: { costPerAcre: 800, expectedYield: 200 },
  soybean: { costPerAcre: 550, expectedYield: 60 },
};
