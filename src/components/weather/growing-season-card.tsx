import { Snowflake } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { GrowingSeason } from "@/lib/weather/types";

import { Explainer } from "./explainer";

export function GrowingSeasonCard({
  season,
}: {
  season: GrowingSeason | null;
}) {
  if (!season) {
    return (
      <Card className="p-5">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
          Growing Season
        </span>
        <p className="text-text-secondary mt-3 text-sm">
          Frost normals unavailable for this location.
        </p>
      </Card>
    );
  }

  const pct = (ord: number) => (ord / 365) * 100;
  const springPct = pct(season.springOrd);
  const seasonWidth = pct(season.fallOrd) - springPct;
  const todayPct = pct(season.todayOrd);
  const inSeason =
    season.todayOrd >= season.springOrd && season.todayOrd <= season.fallOrd;

  return (
    <Card className="flex flex-col p-5">
      <span className="text-text-tertiary text-[11px] font-medium tracking-wide uppercase">
        Growing Season
      </span>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-4xl font-semibold">
          {season.frostFreeDays}
        </span>
        <span className="text-text-secondary text-xs">frost-free days</span>
      </div>

      {/* year timeline with the frost-free window + today marker */}
      <div className="bg-bg-elevated relative mt-4 h-1.5 rounded-full">
        <div
          className="absolute inset-y-0 rounded-full bg-[var(--pos)]/70"
          style={{ left: `${springPct}%`, width: `${seasonWidth}%` }}
        />
        <div
          className="absolute inset-y-[-3px] w-0.5 rounded bg-[var(--accent)]"
          style={{ left: `${todayPct}%` }}
          title="today"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Frost label="Last spring frost" date={season.springFrost} />
        <Frost label="First fall frost" date={season.fallFrost} align="right" />
      </div>

      <p className="text-text-secondary mt-3 text-xs leading-relaxed">
        The average frost-free window for this location —{" "}
        {inSeason ? "the season is underway" : "outside the growing window"}.
      </p>

      <Explainer>
        Averaged over 1991–2020: the last spring date and first fall date the
        overnight low typically reaches 36°F. We use 36°F, not 32°F, because
        frost forms on the ground and crop canopy on calm clear nights when the
        surface cools several degrees below the air temperature — 36°F at gauge
        height lines up with the long-run frost climatology for this area. Frost
        can still land earlier or later in any given year; these norms bracket
        the corn season (plant after the spring date, reach maturity before the
        fall date). The amber tick is today.
      </Explainer>
    </Card>
  );
}

function Frost({
  label,
  date,
  align = "left",
}: {
  label: string;
  date: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div
        className={`text-text-tertiary flex items-center gap-1 text-[10px] ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {align === "left" && <Snowflake className="size-2.5" />}
        {label}
        {align === "right" && <Snowflake className="size-2.5" />}
      </div>
      <div className="tnum text-foreground">{date}</div>
    </div>
  );
}
