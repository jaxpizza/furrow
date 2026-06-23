import type { Metadata } from "next";
import { Map } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Fields" };

export default function FieldsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Fields"
        subtitle="Map, measure, and track every parcel of ground."
      />
      <ComingSoon
        icon={Map}
        title="Interactive field map"
        tagline="Draw field boundaries on satellite imagery, auto-calculate acreage, and track tenure, rent, and the crop planted each season."
        willShow={[
          "A PostGIS-backed map of every field boundary",
          "Acreage computed from geometry, not guessed",
          "Owned vs. cash-rent vs. crop-share tenure and rent/acre",
          "The crop rotation for each field, year over year",
        ]}
      />
    </div>
  );
}
