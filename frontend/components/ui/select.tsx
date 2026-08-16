"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * The single select primitive. The native chevron cannot be positioned, so the
 * control sets `appearance: none` and draws its own; `--select-chevron-inset`
 * both insets the icon from the right edge and reserves the matching padding on
 * the field so long option labels never run underneath it.
 */
export function Select({ children, className = "", ...props }: SelectProps) {
  return (
    <span className="select-shell">
      <select className={`select-input ${className}`.trim()} {...props}>
        {children}
      </select>
      <ChevronDown className="select-chevron" aria-hidden="true" size={16} />
    </span>
  );
}
