import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthFormShell({ eyebrow, title, subtitle, children, footer }: AuthFormShellProps) {
  return (
    <main className="auth-shell">
      <Link className="wordmark" href={ROUTES.home}>
        <span className="wordmark-mark">F</span>
        <span>Fumivanta</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </main>
  );
}
