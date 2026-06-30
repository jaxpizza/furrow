import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { getUnreadAlertCount } from "@/lib/alerts/queries";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, farms } = await getSessionContext();

  // Middleware guards auth, but guard again so types narrow and we never render
  // the shell for a signed-out user.
  if (!user) redirect("/sign-in");
  if (farms.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarmId =
    farms.find((f) => f.id === cookieFarm)?.id ?? farms[0].id;

  const unreadAlerts = await getUnreadAlertCount(activeFarmId);

  return (
    <div className="flex min-h-dvh w-full">
      <AppSidebar unreadAlerts={unreadAlerts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          farms={farms}
          activeFarmId={activeFarmId}
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          unreadAlerts={unreadAlerts}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
