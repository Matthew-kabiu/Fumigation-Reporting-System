"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { ArrowUpRight, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export function MarketingAuth() {
  return (
    <div className="nav-auth">
      <Show when="signed-out">
        <Link className="nav-action" href={ROUTES.signIn}><LogIn size={16} /> Sign in</Link>
        <Link className="nav-action emphasis" href={ROUTES.signUp}><UserPlus size={16} /> Start</Link>
      </Show>
      <Show when="signed-in">
        <Link className="text-link" href={ROUTES.dashboard}>Open workspace <ArrowUpRight size={16} /></Link>
        <UserButton />
      </Show>
    </div>
  );
}
