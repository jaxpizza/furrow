import { FurrowMark } from "@/components/brand/logo";
import type { FarmSummary } from "@/lib/farm";

import { FarmSwitcher } from "./farm-switcher";
import { UserMenu } from "./user-menu";

export function TopBar({
  farms,
  activeFarmId,
  email,
  fullName,
}: {
  farms: FarmSummary[];
  activeFarmId: string;
  email: string;
  fullName: string | null;
}) {
  return (
    <header className="bg-background/80 border-border/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
      <span className="md:hidden">
        <FurrowMark />
      </span>
      <FarmSwitcher farms={farms} activeFarmId={activeFarmId} />
      <div className="flex-1" />
      <UserMenu email={email} fullName={fullName} />
    </header>
  );
}
