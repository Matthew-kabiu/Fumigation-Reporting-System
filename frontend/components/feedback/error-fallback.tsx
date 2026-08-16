"use client";

import { Home, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="fatal-state" role="alert">
      <div className="fatal-mark"><ShieldAlert aria-hidden="true" size={32} /></div>
      <p className="eyebrow">Recovery checkpoint</p>
      <h1>That part of Fumivanta stopped safely.</h1>
      <p>Your saved server data was not changed. Retry the screen, or return to the workspace and continue from a known state.</p>
      <div className="fatal-actions">
        <Button icon={RotateCcw} onClick={onRetry}>Retry screen</Button>
        <Link className="button button-secondary" href={ROUTES.dashboard}><Home aria-hidden="true" size={17} /> Return home</Link>
      </div>
    </main>
  );
}
