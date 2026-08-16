"use client";

import { useSignIn } from "@clerk/nextjs";
import { KeyRound, LogIn, Mail } from "lucide-react";
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

type ResetStep = "email" | "code" | "new-password";

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [resetStep, setResetStep] = useState<ResetStep | null>(null);

  const fieldError = (field: "identifier" | "password" | "code") =>
    errors?.fields?.[field]?.longMessage ?? errors?.fields?.[field]?.message;

  const globalErrors = (errors?.global ?? []).map((e) => e.longMessage ?? e.message);
  const loading = fetchStatus === "fetching";

  async function finalize() {
    await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          const url = decorateUrl(`/sign-in/tasks/${session.currentTask.key}`);
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

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await signIn.password({
      emailAddress: String(formData.get("emailAddress") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (signIn.status === "needs_second_factor") {
      await signIn.mfa.sendEmailCode();
    }
    if (signIn.status === "complete") {
      await finalize();
    }
  }

  async function handleResetEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const emailAddress = String(formData.get("emailAddress") ?? "");
    await signIn.create({ identifier: emailAddress });
    await signIn.resetPasswordEmailCode.sendCode();
    if (signIn.status !== "complete") setResetStep("code");
  }

  async function handleResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await signIn.resetPasswordEmailCode.verifyCode({
      code: String(formData.get("code") ?? ""),
    });
    if (signIn.status === "needs_new_password") setResetStep("new-password");
    else if (signIn.status === "complete") await finalize();
  }

  async function handleNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await signIn.resetPasswordEmailCode.submitPassword({
      password: String(formData.get("password") ?? ""),
    });
    if (signIn.status === "complete") await finalize();
  }

  async function handleSecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await signIn.mfa.verifyEmailCode({ code: String(formData.get("code") ?? "") });
    if (signIn.status === "complete") await finalize();
  }

  if (signIn.status === "needs_second_factor") {
    return (
      <AuthFormShell
        eyebrow="Second factor"
        title="Confirm it's you."
        subtitle="Enter the verification code sent to your email to finish signing in."
        footer={
          <p className="auth-switch">
            <Link href={ROUTES.signUp}>Create an account</Link>
          </p>
        }
      >
        <AuthErrorSummary errors={globalErrors} />
        <form className="auth-form" onSubmit={handleSecondFactor}>
          <AuthCodeField id="code" name="code" label="Verification code" required autoFocus error={fieldError("code")} />
          <Button type="submit" icon={KeyRound} loading={loading}>
            Verify code
          </Button>
        </form>
      </AuthFormShell>
    );
  }

  if (resetStep === "email") {
    return (
      <AuthFormShell
        eyebrow="Password reset"
        title="Recover your account."
        subtitle="We'll send a reset code to the email address on file."
        footer={
          <p className="auth-switch">
            <Link href={ROUTES.signUp}>Create an account</Link> ·{" "}
            <button type="button" className="auth-link-button" onClick={() => setResetStep(null)}>
              Back to sign in
            </button>
          </p>
        }
      >
        <AuthErrorSummary errors={globalErrors} />
        <form className="auth-form" onSubmit={handleResetEmail}>
          <AuthFormField
            id="reset-email"
            name="emailAddress"
            type="email"
            label="Email address"
            autoComplete="email"
            required
            autoFocus
            error={fieldError("identifier")}
          />
          <Button type="submit" icon={Mail} loading={loading}>
            Send reset code
          </Button>
        </form>
      </AuthFormShell>
    );
  }

  if (resetStep === "code" || resetStep === "new-password") {
    return (
      <AuthFormShell
        eyebrow="Password reset"
        title="Verify and reset."
        subtitle="Enter the code we emailed you, then choose a new password."
        footer={
          <p className="auth-switch">
            <Link href={ROUTES.signUp}>Create an account</Link> ·{" "}
            <button type="button" className="auth-link-button" onClick={() => setResetStep(null)}>
              Back to sign in
            </button>
          </p>
        }
      >
        <AuthErrorSummary errors={globalErrors} />
        {resetStep === "code" ? (
          <form className="auth-form" onSubmit={handleResetCode}>
            <AuthCodeField id="reset-code" name="code" label="Reset code" required autoFocus error={fieldError("code")} />
            <Button type="submit" icon={KeyRound} loading={loading}>
              Verify code
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleNewPassword}>
            <AuthPasswordField
              id="new-password"
              name="password"
              label="New password"
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
              error={fieldError("password")}
              hint="At least 8 characters."
            />
            <Button type="submit" icon={KeyRound} loading={loading}>
              Set new password
            </Button>
          </form>
        )}
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      eyebrow="Operator access"
      title="Sign in to Fumivanta."
      subtitle="Enter your credentials to reach the desk, the field, and the reports."
      footer={
        <p className="auth-switch">
          New here? <Link href={ROUTES.signUp}>Create an account</Link>
        </p>
      }
    >
      <AuthErrorSummary errors={globalErrors} />
      <AuthGoogleButton mode="sign-in" />
      <div className="auth-divider">
        <span>or</span>
      </div>
      <form className="auth-form" onSubmit={handlePasswordSignIn}>
        <AuthFormField
          id="email"
          name="emailAddress"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          autoFocus
          error={fieldError("identifier")}
        />
        <AuthPasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          required
          error={fieldError("password")}
        />
        <div className="auth-actions">
          <Button type="submit" icon={LogIn} loading={loading}>
            Sign in
          </Button>
          <button type="button" className="auth-link-button" onClick={() => setResetStep("email")}>
            Forgot password?
          </button>
        </div>
      </form>
    </AuthFormShell>
  );
}
