import { FurrowMark } from "@/components/brand/logo";
import type { FarmSummary } from "@/lib/farm";

import { FarmSwitcher } from "./farm-switcher";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function TopBar({
  farms,
  activeFarmId,
  email,
  fullName,
  unreadAlerts = 0,
}: {
  farms: FarmSummary[];
  activeFarmId: string;
  email: string;
  fullName: string | null;
  unreadAlerts?: number;
}) {
  return (
    <header className="bg-background/80 border-border/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
      {/* Mobile-only: hamburger that opens the full nav (desktop uses the sidebar). */}
      <MobileNav farms={farms} activeFarmId={activeFarmId} unreadAlerts={unreadAlerts} />
      <span className="md:hidden">
        <FurrowMark />
      </span>
      {/* Farm switcher lives in the mobile drawer; in the bar it's desktop-only. */}
      <span className="hidden md:block">
        <FarmSwitcher farms={farms} activeFarmId={activeFarmId} />
      </span>
      <div className="flex-1" />
      <UserMenu email={email} fullName={fullName} />
    </header>
  );
}
