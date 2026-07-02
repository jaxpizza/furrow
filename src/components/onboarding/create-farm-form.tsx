"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVE_FARM_COOKIE, US_STATES } from "@/lib/constants";
import { setBrowserCookie } from "@/lib/cookies";
import { createClient } from "@/lib/supabase/client";

export function CreateFarmForm({
  userId,
  allowCancel,
  defaultName = "",
}: {
  userId: string;
  allowCancel: boolean;
  /** Prefilled so a new farmer can start in one tap. */
  defaultName?: string;
}) {
  const router = useRouter();
  // First farm = the minimal, one-tap path (default mode is Simple, which needs
  // almost nothing). Adding a farm later (from the full app) keeps the fuller form.
  const minimal = !allowCancel;
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState("IL");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    // Generate the id client-side so we don't need an INSERT ... RETURNING.
    // A farm's owner-membership is created by an AFTER INSERT trigger, which
    // runs *after* the RLS SELECT check on a RETURNING row — so `.select()`
    // here would fail the farms read policy. Inserting with a known id sidesteps
    // that ordering entirely.
    const id = crypto.randomUUID();
    const farmName = name.trim() || "My Farm";
    const supabase = createClient();
    const { error } = await supabase
      .from("farms")
      .insert({ id, name: farmName, state, owner_id: userId });

    if (error) {
      toast.error(error.message ?? "Could not create the farm.");
      setPending(false);
      return;
    }

    // Make the new farm active, then land on root — which routes the user to
    // their mode's front door (new users default to the calm Simple screen).
    setBrowserCookie(ACTIVE_FARM_COOKIE, id);
    toast.success(`${farmName} is ready.`);
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-border/80">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="farm-name">Farm name</Label>
            <Input
              id="farm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Farm"
              autoFocus
            />
          </div>

          {/* State only matters for the fuller app (weather, fields). Keep the
              first-run path minimal — default to IL and let full mode set it. */}
          {!minimal && (
            <div className="space-y-1.5">
              <Label htmlFor="farm-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="farm-state" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s} className="tnum">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {allowCancel && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => router.push("/")}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {minimal ? "Show me the market" : "Create farm"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
