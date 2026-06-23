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
}: {
  userId: string;
  allowCancel: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState("IL");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("farms")
      .insert({ name: name.trim(), state, owner_id: userId })
      .select("id")
      .single();

    if (error || !data) {
      toast.error(error?.message ?? "Could not create the farm.");
      setPending(false);
      return;
    }

    // Make the new farm active, then land on the dashboard.
    setBrowserCookie(ACTIVE_FARM_COOKIE, data.id);
    toast.success(`${name.trim()} is ready.`);
    router.push("/dashboard");
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
              placeholder="Prairie Creek Farms"
              autoFocus
              required
            />
          </div>
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
          <div className="flex gap-2 pt-1">
            {allowCancel && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => router.push("/dashboard")}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create farm
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
