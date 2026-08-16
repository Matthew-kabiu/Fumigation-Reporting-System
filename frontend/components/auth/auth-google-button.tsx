"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { ROUTES, SSO_CALLBACK_ROUTE } from "@/lib/routes";

type AuthGoogleButtonProps = {
  mode: "sign-in" | "sign-up";
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Google social sign-in. `redirectUrl` is where Clerk lands the user once the
 * OAuth round trip completes; `redirectCallbackUrl` only comes into play when no
 * session was created and Clerk needs to collect more information first.
 */
export function AuthGoogleButton({ mode }: AuthGoogleButtonProps) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const params = {
      strategy: "oauth_google" as const,
      redirectUrl: ROUTES.dashboard,
      redirectCallbackUrl: SSO_CALLBACK_ROUTE,
    };
    try {
      const { error: ssoError } = mode === "sign-in" ? await signIn.sso(params) : await signUp.sso(params);
      if (ssoError) setError("Could not start Google sign-in. Try again or use your email and password.");
    } catch {
      setError("Could not start Google sign-in. Try again or use your email and password.");
    } finally {
      // Reset in `finally` so a thrown SSO call cannot strand the button in its
      // pending state. On success the browser is already navigating away.
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="auth-social-button" onClick={() => void handleClick()} disabled={pending}>
        <GoogleMark />
        <span>{pending ? "Redirecting..." : mode === "sign-in" ? "Sign in with Google" : "Sign up with Google"}</span>
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
