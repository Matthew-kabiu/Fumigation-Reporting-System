import type { InputHTMLAttributes } from "react";

type AuthCodeFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function AuthCodeField({ id, label, error, hint, className = "", ...props }: AuthCodeFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`auth-input auth-code ${error ? "auth-input-error" : ""} ${className}`.trim()}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="auth-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="auth-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
