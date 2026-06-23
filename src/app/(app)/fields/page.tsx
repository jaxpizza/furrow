import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Map } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { FieldsWorkspace } from "@/components/fields/fields-workspace";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";
import { FIELD_COLUMNS, type MapField } from "@/lib/fields";
import { createClient } from "@/lib/supabase/server";
import type { Polygon } from "geojson";

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

  return (
    <FieldsWorkspace
      token={token}
      farmId={activeFarm.id}
      farmName={activeFarm.name}
      initialFields={initialFields}
    />
  );
}
