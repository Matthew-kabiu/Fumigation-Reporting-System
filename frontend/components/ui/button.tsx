"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  iconPosition?: "start" | "end";
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  children,
  icon: Icon,
  iconPosition = "start",
  loading = false,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {iconPosition === "start" && <Icon aria-hidden="true" size={17} />}
      <span>{loading ? "Working..." : children}</span>
      {iconPosition === "end" && <Icon aria-hidden="true" size={17} />}
    </button>
  );
}
