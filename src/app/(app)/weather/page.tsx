import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Map } from "lucide-react";
import type { Polygon } from "geojson";

import { PageHeader } from "@/components/common/page-header";
import { CurrentConditionsCard } from "@/components/weather/current-conditions";
import { FieldSelector } from "@/components/weather/field-selector";
import { ForecastCard } from "@/components/weather/forecast-card";
import { GddCard } from "@/components/weather/gdd-card";
import { GrowingSeasonCard } from "@/components/weather/growing-season-card";
import { RainfallCard } from "@/components/weather/rainfall-card";
import { SoilCard } from "@/components/weather/soil-card";
import { StressFlagsCard } from "@/components/weather/stress-flags";
import { WeatherAttribution } from "@/components/weather/attribution";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { createClient } from "@/lib/supabase/server";
import {
  fieldMarkers,
  resolveLocation,
  type WeatherField,
} from "@/lib/weather/location";
import { getWeatherDashboard } from "@/lib/weather/service";

export const metadata: Metadata = { title: "Weather" };

export default async function WeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];

  const supabase = await createClient();
  const { data } = await supabase
    .from("fields")
    .select("id, name, geom")
    .eq("farm_id", activeFarm.id)
    .order("created_at", { ascending: true });

  const fields: WeatherField[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    geom: f.geom as unknown as Polygon,
  }));

  const { field: fieldParam } = await searchParams;
  const selected = fieldParam ?? "all";
  const location = resolveLocation(fields, selected);
  const wx = await getWeatherDashboard(location, new Date());

  // Markers for the radar: the chosen field, or every field when "all".
  const allMarkers = fieldMarkers(fields);
  const markers = location.fieldId
    ? allMarkers.filter((m) => m.id === location.fieldId)
    : allMarkers;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Weather"
        subtitle={
          location.perField
            ? `Per-field weather for ${location.label}.`
            : "Per-field weather intelligence. Open it every morning."
        }
        action={
          fields.length > 0 ? (
            <FieldSelector
              fields={fields.map((f) => ({ id: f.id, name: f.name }))}
              selected={selected}
            />
          ) : undefined
        }
      />

      {fields.length === 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-4">
          <Map className="size-5 shrink-0 text-[var(--accent)]" />
          <p className="text-text-secondary text-sm">
            No fields drawn yet — showing{" "}
            <span className="text-foreground font-medium">central Illinois</span>.{" "}
            <Link
              href="/fields"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Draw your fields
            </Link>{" "}
            for per-field precision.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CurrentConditionsCard
          current={wx.current}
          lat={location.lat}
          lon={location.lon}
          markers={markers}
        />
        <RainfallCard rainfall={wx.rainfall} />
        <SoilCard soil={wx.soil} />
        <ForecastCard
          daily={wx.daily}
          hourly={wx.hourly}
          fieldwork={wx.fieldwork}
        />
        <GddCard gdd={wx.gdd} />
        <GrowingSeasonCard season={wx.growingSeason} />
        <StressFlagsCard stress={wx.stress} />
      </div>

      <WeatherAttribution />
    </div>
  );
}
