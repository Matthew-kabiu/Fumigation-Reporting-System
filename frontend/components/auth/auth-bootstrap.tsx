"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@backend/_generated/api";
import { purgeLegacyOfflineData, purgeOfflineData } from "@/lib/offline/database";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncCurrent = useMutation(api.users.syncCurrent);
  const [result, setResult] = useState<{ userId: string; state: "ready" | "pending" | "failed" }>();
  const state = result && result.userId === userId ? result.state : "syncing";

  useEffect(() => {
    if (!userId || isLoading || !isAuthenticated) return;
    let active = true;
    Promise.all([syncCurrent({}), purgeLegacyOfflineData()])
      .then(async ([account]) => {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          (navigator.serviceWorker.controller ?? registration?.active)?.postMessage({ type: "SET_ACCOUNT", userId });
        }
        if (active) setResult({ userId, state: account.status === "active" ? "ready" : "pending" });
      })
      .catch(() => active && setResult({ userId, state: "failed" }));
    return () => {
      active = false;
    };
  }, [isAuthenticated, isLoading, syncCurrent, userId]);

  if (userId && !isLoading && !isAuthenticated) {
    return <div className="center-state error-state">Your Clerk session could not be authenticated by Convex. Refresh the page or sign in again.</div>;
  }

  if (state === "syncing") {
    return <div className="center-state"><LoaderCircle className="spin" /> Preparing your workspace...</div>;
  }
  if (state === "failed") {
    return <div className="center-state error-state">Your account could not be synchronized. Check the local Convex service and try again.</div>;
  }
  if (state === "pending") {
    return <div className="center-state"><p>Your account is awaiting administrator approval.</p><button className="button button-secondary" type="button" onClick={() => void purgeOfflineData(userId!).finally(() => signOut({ redirectUrl: "/" }))}>Sign out</button></div>;
  }
  return children;
}
