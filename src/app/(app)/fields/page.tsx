import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Map } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { FieldsWorkspace } from "@/components/fields/fields-workspace";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { FIELD_COLUMNS, type FieldHarvest, type FieldPlanting, type MapField } from "@/lib/fields";
import { createClient } from "@/lib/supabase/server";
import type { Polygon } from "geojson";

type DB = Awaited<ReturnType<typeof createClient>>;

export const metadata: Metadata = { title: "Fields" };

export default async function FieldsPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          icon={Map}
          title="Map needs a Mapbox token"
          tagline="Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment to enable the field map."
          willShow={["Satellite field drawing", "Auto-calculated acreage"]}
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("fields")
    .select(FIELD_COLUMNS)
    .eq("farm_id", activeFarm.id)
    .order("created_at", { ascending: true });

  const initialFields: MapField[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    acreage: r.acreage,
    tenure: r.tenure,
    rent_per_acre: r.rent_per_acre,
    geom: r.geom as unknown as Polygon,
  }));

  const fieldIds = initialFields.map((f) => f.id);
  const [plantings, fieldHarvests] = await Promise.all([
    loadPlantings(supabase, fieldIds),
    loadFieldHarvests(supabase, activeFarm.id),
  ]);

  return (
    <FieldsWorkspace
      token={token}
      farmId={activeFarm.id}
      farmName={activeFarm.name}
      initialFields={initialFields}
      initialPlantings={plantings}
      fieldHarvests={fieldHarvests}
    />
  );
}

/** Planting records for the farm's fields (public.plantings, field-scoped RLS). */
async function loadPlantings(
  supabase: DB,
  fieldIds: string[],
): Promise<FieldPlanting[]> {
  if (fieldIds.length === 0) return [];
  try {
    const { data } = await supabase
      .from("plantings")
      .select("id, field_id, crop, crop_year, planted_date")
      .in("field_id", fieldIds);
    return (data ?? []).map((p) => ({
      id: p.id,
      fieldId: p.field_id,
      crop: p.crop,
      cropYear: p.crop_year,
      plantedDate: p.planted_date,
    }));
  } catch {
    return [];
  }
}

/** Harvests OPTIONALLY tagged to a field, summed per field+year for yield history.
 *  Wrapped defensively: harvest_entries.field_id arrives with migration 0018, so
 *  pre-migration this degrades to no yields (plantings still show). */
async function loadFieldHarvests(
  supabase: DB,
  farmId: string,
): Promise<FieldHarvest[]> {
  try {
    const { data, error } = await supabase
      .from("harvest_entries")
      .select("field_id, crop, crop_year, bushels")
      .eq("farm_id", farmId)
      .not("field_id", "is", null);
    if (error || !data) return [];
    return data
      .filter((h) => h.field_id)
      .map((h) => ({ fieldId: h.field_id as string, crop: h.crop, cropYear: h.crop_year, bushels: h.bushels }));
  } catch {
    return [];
  }
}
