"use client";

import { useSignUp } from "@clerk/nextjs";
import { KeyRound, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCodeField } from "@/components/auth/auth-code-field";
import { AuthErrorSummary } from "@/components/auth/auth-error-summary";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { AuthGoogleButton } from "@/components/auth/auth-google-button";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [codeSent, setCodeSent] = useState(false);

  const fieldError = (field: "firstName" | "lastName" | "emailAddress" | "password" | "code") =>
    errors?.fields?.[field]?.longMessage ?? errors?.fields?.[field]?.message;

  const globalErrors = (errors?.global ?? []).map((e) => e.longMessage ?? e.message);
  const loading = fetchStatus === "fetching";

  const needsEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  async function finalize() {
    await signUp.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          const url = decorateUrl(`/sign-up/tasks/${session.currentTask.key}`);
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
          return;
        }
        const url = decorateUrl(ROUTES.dashboard);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { error } = await signUp.password({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      emailAddress: String(formData.get("emailAddress") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (error) return;
    await signUp.verifications.sendEmailCode();
    setCodeSent(true);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { error } = await signUp.verifications.verifyEmailCode({
      code: String(formData.get("code") ?? ""),
    });
    if (error) return;
    if (signUp.status === "complete") await finalize();
  }

  async function handleResendCode() {
    await signUp.verifications.sendEmailCode();
    setCodeSent(true);
  }

  if (needsEmailVerification || codeSent) {
    return (
      <AuthFormShell
        eyebrow="Verify your email"
        title="Check your inbox."
        subtitle="We sent a 6-digit code to confirm your email address."
        footer={
          <p className="auth-switch">
            Already have an account? <Link href={ROUTES.signIn}>Sign in</Link>
          </p>
        }
      >
        <AuthErrorSummary errors={globalErrors} />
        <form className="auth-form" onSubmit={handleVerify}>
          <AuthCodeField id="code" name="code" label="Verification code" required autoFocus error={fieldError("code")} />
          <Button type="submit" icon={KeyRound} loading={loading}>
            Verify email
          </Button>
        </form>
        <p className="auth-resend">
          Didn&apos;t get it?{" "}
          <button type="button" className="auth-link-button" onClick={() => void handleResendCode()} disabled={loading}>
            Resend code
          </button>
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      eyebrow="Company workspace"
      title="Set up your account."
      subtitle="Create your Fumivanta account. Your workspace is provisioned the moment you verify your email."
      footer={
        <p className="auth-switch">
          Already have an account? <Link href={ROUTES.signIn}>Sign in</Link>
        </p>
      }
    >
      <AuthErrorSummary errors={globalErrors} />
      <AuthGoogleButton mode="sign-up" />
      <div className="auth-divider">
        <span>or</span>
      </div>
      <form className="auth-form" onSubmit={handleSignUp}>
        <div className="field-grid">
          <AuthFormField
            id="first-name"
            name="firstName"
            label="First name"
            autoComplete="given-name"
            required
            error={fieldError("firstName")}
          />
          <AuthFormField
            id="last-name"
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            required
            error={fieldError("lastName")}
          />
        </div>
        <AuthFormField
          id="email"
          name="emailAddress"
          type="email"
          label="Work email"
          autoComplete="email"
          required
          error={fieldError("emailAddress")}
        />
        <AuthPasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          minLength={8}
          required
          error={fieldError("password")}
          hint="At least 8 characters."
        />
        <Button type="submit" icon={UserPlus} loading={loading}>
          Create account
        </Button>
        <div id="clerk-captcha" />
      </form>
    </AuthFormShell>
  );
}
