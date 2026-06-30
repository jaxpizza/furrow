import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
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
  const { user, profile, farms, impersonating } = await getSessionContext();

  // Middleware guards auth, but guard again so types narrow and we never render
  // the shell for a signed-out user.
  if (!user) redirect("/sign-in");
  // Don't bounce an admin to onboarding while viewing-as a user who has no farm —
  // show the banner + a notice instead.
  if (farms.length === 0 && !impersonating) redirect("/onboarding");

  const banner = impersonating ? (
    <ImpersonationBanner targetName={impersonating.targetName} targetEmail={impersonating.targetEmail} />
  ) : null;

  if (farms.length === 0) {
    return (
      <div className="flex min-h-dvh w-full flex-col">
        {banner}
        <div className="text-text-secondary mx-auto mt-20 max-w-md px-4 text-center text-sm">
          This tester hasn&apos;t created a farm yet — there&apos;s nothing to show in their account.{" "}
          <Link href="/admin/users" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookieFarm = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarmId = farms.find((f) => f.id === cookieFarm)?.id ?? farms[0].id;

  const unreadAlerts = await getUnreadAlertCount(activeFarmId);

  return (
    <div className="flex min-h-dvh w-full flex-col">
      {banner}
      <div className="flex w-full flex-1">
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
    </div>
  );
}
