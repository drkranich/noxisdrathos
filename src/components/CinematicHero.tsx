import { type ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  backgroundUrl?: string | null;
  height?: "sm" | "md" | "lg";
};

const HEIGHTS = {
  sm: "h-[52vh] min-h-[380px]",
  md: "h-[68vh] min-h-[480px]",
  lg: "h-[80vh] min-h-[560px]",
};

/**
 * Cinematic hero with mesh gradient, parallax pan, vignette, grain, and
 * ambient particles. Honors prefers-reduced-motion through global CSS.
 */
export function CinematicHero({
  eyebrow,
  title,
  lead,
  actions,
  backgroundUrl,
  height = "md",
}: Props) {
  return (
    <section
      className={`relative overflow-hidden border-b border-border vignette grain-soft mesh-gradient ${HEIGHTS[height]}`}
    >
      {backgroundUrl ? (
        <div
          className="absolute inset-0 -z-10 animate-slow-pan"
          style={{
            backgroundImage: `linear-gradient(180deg, oklch(0.10 0.005 270 / 0.35) 0%, oklch(0.08 0.005 270 / 0.92) 100%), url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}

      {/* Ambient particles */}
      <div className="pointer-events-none absolute inset-0 -z-[5]">
        <span className="particle" style={{ top: "18%", left: "12%" }} />
        <span className="particle" style={{ top: "62%", left: "78%", animationDelay: "3s" }} />
        <span className="particle" style={{ top: "38%", left: "55%", animationDelay: "6s" }} />
        <span className="particle" style={{ top: "78%", left: "28%", animationDelay: "9s" }} />
        <span className="particle" style={{ top: "24%", left: "88%", animationDelay: "4.5s" }} />
      </div>

      <div className="relative h-full flex flex-col justify-end px-8 lg:px-14 pb-12 max-w-5xl">
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground animate-fade-up">
            <span className="neon-dot animate-blink mr-2 inline-block align-middle" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[0.95] text-balance animate-fade-up delay-100">
          {title}
        </h1>
        {lead ? (
          <p className="mt-6 max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed animate-fade-up delay-200">
            {lead}
          </p>
        ) : null}
        {actions ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up delay-300">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
