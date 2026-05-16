import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RecContent } from "@/lib/recommendations.functions";
import { Skeleton } from "@/components/Skeleton";

export function RailCard({ content }: { content: RecContent }) {
  return (
    <Link
      to="/explore/$slug"
      params={{ slug: content.slug }}
      className="group relative block w-72 shrink-0 snap-start focus-ring rounded-sm"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden border border-border bg-card transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-foreground/30"
        style={{
          backgroundImage: content.thumbnail_url
            ? `url(${content.thumbnail_url})`
            : "linear-gradient(135deg, oklch(0.18 0.01 270), oklch(0.13 0.005 270))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-90 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-background/70 backdrop-blur">
            {content.type}
          </span>
          {content.is_featured ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-foreground/90 text-background">
              destaque
            </span>
          ) : null}
        </div>
        {/* Hover metadata reveal */}
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          {content.subtitle ? (
            <p className="text-[11px] text-foreground/90 line-clamp-2">{content.subtitle}</p>
          ) : null}
        </div>
        {/* Progress bar */}
        {content.progress_ratio != null && content.progress_ratio > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-foreground/10">
            <div
              className="h-full bg-foreground/80"
              style={{ width: `${Math.round(content.progress_ratio * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <h3 className="text-sm font-medium leading-snug text-balance group-hover:text-foreground transition-colors">
          {content.title}
        </h3>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {content.duration_seconds
            ? `${Math.round(content.duration_seconds / 60)} min`
            : content.reading_minutes
            ? `${content.reading_minutes} min de leitura`
            : new Date(content.created_at).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </Link>
  );
}

export function ContentRail({
  title,
  subtitle,
  items,
  loading,
}: {
  title: string;
  subtitle?: string;
  items: RecContent[] | null;
  loading?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<{ left: boolean; right: boolean }>({ left: false, right: true });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setEdges({
        left: el.scrollLeft > 8,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  if (!loading && items !== null && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="font-display text-2xl lowercase tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground shrink-0">
          {items?.length ?? "—"} itens
        </span>
      </div>
      <div className="relative">
        {edges.left ? (
          <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background to-transparent z-10" />
        ) : null}
        {edges.right ? (
          <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent z-10" />
        ) : null}
        <div
          ref={scrollerRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {loading || items === null
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-72 shrink-0">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <Skeleton className="mt-3 h-3 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))
            : items.map((c) => <RailCard key={c.id} content={c} />)}
        </div>
      </div>
    </section>
  );
}
