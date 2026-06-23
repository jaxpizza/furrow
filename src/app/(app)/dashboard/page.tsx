import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { FieldsCard } from "@/components/dashboard/fields-card";
import { HeroPriceCard } from "@/components/dashboard/hero-price-card";
import { NewsCard } from "@/components/dashboard/news-card";
import { WeatherCard } from "@/components/dashboard/weather-card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle="Your farm's money and markets at a glance. Figures shown are sample data."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HeroPriceCard />
        <WeatherCard />
        <FieldsCard />
        <NewsCard />
      </div>
    </div>
  );
}
