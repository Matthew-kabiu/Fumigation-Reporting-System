"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

function ConfiguredProviders({
  children,
  convexUrl,
}: {
  children: ReactNode;
  convexUrl: string;
}) {
  const [client] = useState(() => new ConvexReactClient(convexUrl));

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!publishableKey || !convexUrl) {
    throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and NEXT_PUBLIC_CONVEX_URL are required");
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConfiguredProviders convexUrl={convexUrl}>{children}</ConfiguredProviders>
    </ClerkProvider>
  );
}
