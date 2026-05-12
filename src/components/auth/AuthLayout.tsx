import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial left panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border p-10">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 30% 30%, oklch(0.88 0.22 145 / 0.10), transparent 60%), radial-gradient(ellipse 50% 50% at 80% 90%, oklch(0.88 0.22 145 / 0.06), transparent 60%)",
          }}
        />
        <div className="grid-lines absolute inset-0 -z-10 opacity-[0.04]" />

        <Link to="/" className="flex items-center gap-3">
          <span className="neon-dot animate-blink" />
          <span className="font-mono text-xs uppercase tracking-[0.3em]">observatório</span>
        </Link>

        <div className="max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="font-display mt-6 text-5xl leading-[0.95] text-balance">{title}</h1>
          {subtitle ? (
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          edição 014 — volume privado
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-2 mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            <span className="neon-dot animate-blink" />
            observatório
          </Link>
          {children}
          {footer ? <div className="mt-8 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
