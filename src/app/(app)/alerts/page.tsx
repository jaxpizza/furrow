import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { AlertsFeed } from "@/components/alerts/alerts-feed";
import { Card } from "@/components/ui/card";
import { evaluateFarm } from "@/lib/alerts/evaluate";
import { getRecentAlerts, markAlertsRead } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0];

  // Evaluate first so any just-crossed thresholds appear, then read the feed
  // (still showing this visit's unread highlight), then clear unread.
  await evaluateFarm(activeFarm.id);
  const alerts = await getRecentAlerts(activeFarm.id);
  await markAlertsRead(activeFarm.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Alerts"
        subtitle="Break-even and profit-target crossings on your local cash price."
      />

      {alerts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="rounded-full bg-bg-elevated p-3">
            <BellRing className="size-5 text-[var(--accent)]" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              No alerts yet
            </p>
            <p className="text-text-secondary mx-auto max-w-sm text-sm leading-relaxed">
              Set a break-even on the{" "}
              <span className="text-foreground">Markets</span> page. We&apos;ll
              watch your local cash price and post here the moment it reaches
              break-even or your profit target.
            </p>
          </div>
        </Card>
      ) : (
        <AlertsFeed alerts={alerts} />
      )}

      <p className="text-text-tertiary mt-4 text-center text-[11px]">
        Alerts are informational, not financial advice.
      </p>
    </div>
  );
}
