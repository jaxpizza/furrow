"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutList, LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { setAppMode } from "@/lib/mode-action";

export function UserMenu({
  email,
  fullName,
}: {
  email: string;
  fullName: string | null;
}) {
  const router = useRouter();
  const [, startSwitch] = useTransition();
  const initial = (fullName ?? email).charAt(0).toUpperCase();

  function switchToSimple() {
    startSwitch(async () => {
      await setAppMode("simple").catch(() => {});
      router.push("/today");
      router.refresh();
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-2">
        <Avatar className="border-border size-8 border">
          <AvatarFallback className="bg-bg-elevated text-foreground text-xs font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{fullName ?? "Account"}</span>
          <span className="text-text-tertiary truncate text-xs font-normal">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={switchToSimple} className="gap-2">
          <LayoutList className="size-4" />
          Simple view
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2">
          <UserRound className="size-4" />
          Profile settings
          <span className="text-text-tertiary ml-auto text-[10px]">soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut} className="gap-2">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
