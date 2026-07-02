import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SimpleHeader } from "@/components/simple/simple-header";
import { ACTIVE_FARM_COOKIE } from "@/lib/constants";
import { getSessionContext } from "@/lib/farm";

/**
 * The Simple surface has NO app-shell nav — it's one calm, scrollable column. Just
 * the auth + onboarding guards (mirroring the full app), a slim header, and the
 * page. Mobile-first: a narrow, centered, generously-spaced column.
 */
export default async function SimpleLayout({ children }: { children: React.ReactNode }) {
  const { user, farms, impersonating } = await getSessionContext();

  if (!user) redirect("/sign-in");
  if (farms.length === 0 && !impersonating) redirect("/onboarding");

  const cookieFarm = (await cookies()).get(ACTIVE_FARM_COOKIE)?.value;
  const activeFarm = farms.find((f) => f.id === cookieFarm) ?? farms[0] ?? null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-20 sm:px-6">
      <SimpleHeader farmName={activeFarm?.name ?? null} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
