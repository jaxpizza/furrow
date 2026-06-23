import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Markets"
        subtitle="Futures, basis, and a model-driven sell/hold read."
      />
      <ComingSoon
        icon={TrendingUp}
        title="Market terminal"
        tagline="Live corn and soybean futures, local elevator basis, and a clear favorable / hold / unfavorable read on when to price grain."
        willShow={[
          "Candlestick price charts (TradingView lightweight-charts)",
          "Local elevator basis quotes by delivery month",
          "Breakeven vs. market, mapped to your cost of production",
          "A three-state sell/hold signal — never color alone",
        ]}
      />
    </div>
  );
}
