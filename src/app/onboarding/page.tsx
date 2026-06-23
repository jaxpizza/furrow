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
  const { user, farms } = await getSessionContext();
  if (!user) redirect("/sign-in");

  const { add } = await searchParams;
  // Already has farms and not explicitly adding another → straight to dashboard.
  if (farms.length > 0 && !add) redirect("/dashboard");

  const isFirstFarm = farms.length === 0;

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
              {isFirstFarm ? "Set up your first farm" : "Add a farm"}
            </h1>
            <p className="text-text-secondary text-sm">
              {isFirstFarm
                ? "A farm is your workspace — fields, markets, and money all live under it. You'll be the owner."
                : "Create another farm workspace. You'll be its owner."}
            </p>
          </div>
          <CreateFarmForm userId={user.id} allowCancel={!isFirstFarm} />
        </div>
      </main>
    </div>
  );
}
