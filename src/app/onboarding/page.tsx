import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContourField } from "@/components/brand/contour-field";
import { FurrowLogo } from "@/components/brand/logo";
import { CreateFarmForm } from "@/components/onboarding/create-farm-form";
import { getSessionContext } from "@/lib/farm";

export const metadata: Metadata = { title: "Set up your farm" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const { user, profile, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");

  const { add } = await searchParams;
  // Already has farms and not explicitly adding another → root routes by mode.
  if (farms.length > 0 && !add) redirect("/");

  const isFirstFarm = farms.length === 0;
  // Prefill the farm name so a new farmer can start in a single tap.
  const first = profile?.full_name?.trim().split(/\s+/)[0];
  const defaultName = isFirstFarm && first ? `${first}'s Farm` : "";

  return (
    <div className="relative flex min-h-dvh flex-col">
      <ContourField className="text-[var(--accent)]" opacity={0.05} />
      <header className="relative flex h-14 items-center px-6">
        <FurrowLogo />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {isFirstFarm ? "Name your farm, then let's look at the market" : "Add a farm"}
            </h1>
            <p className="text-text-secondary text-sm">
              {isFirstFarm
                ? "That's all we need to get started — you can add your costs later if you want."
                : "Create another farm workspace. You'll be its owner."}
            </p>
          </div>
          <CreateFarmForm userId={user.id} allowCancel={!isFirstFarm} defaultName={defaultName} />
        </div>
      </main>
    </div>
  );
}
