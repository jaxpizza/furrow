"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Crop } from "@/lib/types/database";

export function BasisForm({
  farmId,
  crop,
  initialBasisCents,
  initialElevator,
  onSaved,
}: {
  farmId: string;
  crop: Crop;
  initialBasisCents: number | null;
  initialElevator: string | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [basis, setBasis] = useState(
    initialBasisCents != null ? String(initialBasisCents) : "",
  );
  const [elevator, setElevator] = useState(initialElevator ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (basis === "") return;
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.from("basis_entries").upsert(
      {
        farm_id: farmId,
        crop,
        basis_cents: Number(basis),
        elevator_name: elevator.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "farm_id,crop" },
    );

    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not save basis.");
      return;
    }
    toast.success("Basis saved");
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="basis-cents">Basis (¢ vs futures)</Label>
          <Input
            id="basis-cents"
            type="number"
            step="1"
            inputMode="numeric"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            placeholder="-25"
            className="tnum"
            autoFocus
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="basis-elevator">Elevator (optional)</Label>
          <Input
            id="basis-elevator"
            value={elevator}
            onChange={(e) => setElevator(e.target.value)}
            placeholder="Local co-op"
          />
        </div>
      </div>
      <p className="text-text-tertiary text-xs leading-relaxed">
        Negative basis is normal (cash below futures). Cash price = futures +
        your basis.
      </p>
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save basis
      </Button>
    </form>
  );
}
