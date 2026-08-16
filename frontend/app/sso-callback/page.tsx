"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthErrorSummary } from "@/components/auth/auth-error-summary";
import { ROUTES } from "@/lib/routes";

/**
 * Landing page for Google sign-in when Clerk could not create a session outright
 * and needs to route the user onward: second factor, a transfer between sign-up
 * and sign-in, or missing profile fields. `handleRedirectCallback` consumes the
 * OAuth parameters and performs the navigation itself.
 */
export default function SSOCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handleRedirectCallback(
      {
        signInUrl: ROUTES.signIn,
        signUpUrl: ROUTES.signUp,
        signInForceRedirectUrl: ROUTES.dashboard,
        signUpForceRedirectUrl: ROUTES.dashboard,
        secondFactorUrl: ROUTES.signIn,
        resetPasswordUrl: ROUTES.signIn,
        continueSignUpUrl: ROUTES.signUp,
      },
      async (to) => router.push(to),
    ).catch(() => setFailed(true));
  }, [handleRedirectCallback, router]);

  return (
    <AuthFormShell
      eyebrow="Signing you in"
      title="One moment."
      subtitle="Finishing your Google sign-in and preparing your workspace."
    >
      {failed ? (
        <>
          <AuthErrorSummary errors={["We could not finish your Google sign-in. Please try again."]} />
          <p className="auth-switch">
            <a href={ROUTES.signIn}>Back to sign in</a>
          </p>
        </>
      ) : (
        <p className="auth-hint">Redirecting...</p>
      )}
    </AuthFormShell>
  );
}
