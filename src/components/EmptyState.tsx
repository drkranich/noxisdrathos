import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: "archive" | "bookmark" | "clock" | "spark" | "wave" | "signal";
};

/**
 * Curated empty state — editorial, quiet, atmospheric.
 * No emojis, no childish illustrations. Just light, type, and silence.
 */
export function EmptyState({ eyebrow, title, description, action, icon = "spark" }: Props) {
  return (
    <div className="relative overflow-hidden border border-border rounded-sm px-8 md:px-16 py-20 md:py-28 text-center vignette grain-soft">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-60" />
      <div className="mx-auto max-w-md flex flex-col items-center">
        <EmptyGlyph kind={icon} />
        {eyebrow ? (
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground animate-fade-up">
            <span className="neon-dot mr-2 inline-block align-middle" />
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-5 font-display text-2xl md:text-3xl text-balance animate-fade-up delay-100">
          {title}
        </h3>
        {description ? (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed animate-fade-up delay-200">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-8 animate-fade-up delay-300">{action}</div> : null}
      </div>
    </div>
  );
}

function EmptyGlyph({ kind }: { kind: NonNullable<Props["icon"]> }) {
  return (
    <div className="relative h-20 w-20 flex items-center justify-center animate-fade-up">
      <div className="absolute inset-0 rounded-full bg-[var(--neon-soft)] blur-2xl opacity-40" />
      <svg
        viewBox="0 0 48 48"
        className="relative h-12 w-12 text-foreground/70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        {kind === "archive" && (
          <>
            <rect x="8" y="14" width="32" height="26" />
            <path d="M6 10h36v4H6z" />
            <path d="M20 22h8" />
          </>
        )}
        {kind === "bookmark" && <path d="M14 6h20v36l-10-7-10 7z" />}
        {kind === "clock" && (
          <>
            <circle cx="24" cy="24" r="18" />
            <path d="M24 12v12l8 5" />
          </>
        )}
        {kind === "spark" && (
          <>
            <path d="M24 6v36M6 24h36" />
            <circle cx="24" cy="24" r="6" />
          </>
        )}
        {kind === "wave" && (
          <path d="M4 24c4-8 8-8 12 0s8 8 12 0 8-8 12 0" />
        )}
        {kind === "signal" && (
          <>
            <circle cx="24" cy="24" r="3" />
            <circle cx="24" cy="24" r="10" opacity="0.6" />
            <circle cx="24" cy="24" r="18" opacity="0.3" />
          </>
        )}
      </svg>
    </div>
  );
}
