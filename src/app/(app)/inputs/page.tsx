import type { Metadata } from "next";
import { Sprout } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Inputs" };

export default function InputsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Inputs"
        subtitle="Track input purchases and cost of production."
      />
      <ComingSoon
        icon={Sprout}
        title="Input & cost tracking"
        tagline="Log seed, fertilizer, chemicals, and fuel to build a true per-acre and per-bushel cost of production that drives the breakeven on every market decision."
        willShow={[
          "Purchases by category, product, and crop year",
          "Cost per acre and per bushel, by field",
          "Breakeven that feeds the Markets sell/hold read",
          "Year-over-year input cost trends",
        ]}
      />
    </div>
  );
}
