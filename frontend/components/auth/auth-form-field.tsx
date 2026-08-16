import type { InputHTMLAttributes } from "react";

type AuthFormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function AuthFormField({ id, label, error, hint, className = "", ...props }: AuthFormFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`auth-input ${error ? "auth-input-error" : ""} ${className}`.trim()}
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
