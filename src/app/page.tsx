import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/landing";
import { createClient } from "@/lib/supabase/server";

// Root: signed-in users go straight to their app; logged-out visitors get the
// marketing landing page. Middleware treats "/" as public, so a logged-out
// visitor reaches this without a sign-in redirect.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <Landing />;
}
