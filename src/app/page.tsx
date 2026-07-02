import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/landing";
import { resolveAppMode, MODE_HOME } from "@/lib/app-mode";
import { getSessionContext } from "@/lib/farm";

// Root: logged-out visitors get the marketing landing; signed-in users go to the
// front door their preference points at — the calm Simple screen (default) or the
// full app. Middleware treats "/" as public, so a logged-out visitor reaches this
// without a sign-in redirect.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { user, profile } = await getSessionContext();

  if (user) redirect(MODE_HOME[resolveAppMode(profile)]);

  return <Landing />;
}
