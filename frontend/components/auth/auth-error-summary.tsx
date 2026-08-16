"use client";

import { AlertTriangle } from "lucide-react";

type AuthErrorSummaryProps = {
  errors?: string[];
};

export function AuthErrorSummary({ errors }: AuthErrorSummaryProps) {
  if (!errors || errors.length === 0) return null;
  // Deduplicate so the message itself is a stable key: an index key would
  // reassociate rows whenever the error list changes between renders.
  const messages = [...new Set(errors)];
  return (
    <div className="auth-error-summary" role="alert">
      <AlertTriangle size={15} aria-hidden="true" />
      <div>
        {messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  );
}
