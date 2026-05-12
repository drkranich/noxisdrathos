import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-8 lg:px-14 py-16 max-w-5xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      <h1 className="font-display text-5xl mt-4 text-balance">{title}</h1>
      {description ? (
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground leading-relaxed">{description}</p>
      ) : null}
      <div className="mt-12">
        {children ?? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              em curadoria
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Esta sessão está sendo preparada. Volte em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
