"use client";

import { ErrorFallback } from "@/components/feedback/error-fallback";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback onRetry={reset} />;
}
