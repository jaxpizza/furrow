import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="News"
        subtitle="Market-moving headlines, filtered for relevance."
      />
      <ComingSoon
        icon={Newspaper}
        title="Curated market news"
        tagline="USDA reports, weather, and ag-market headlines distilled to what actually moves corn and soybean prices — with an AI read on the likely market impact."
        willShow={[
          "WASDE, export sales, and crop-progress releases",
          "Headlines tagged by likely price impact",
          "Weather events relevant to the eastern Corn Belt",
          "An AI summary of why each item matters to your farm",
        ]}
      />
    </div>
  );
}
