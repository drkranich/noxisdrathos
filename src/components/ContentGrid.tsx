import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SaveButton } from "@/components/SaveButton";

export type ContentRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: string;
  content_kind?: string | null;
  thumbnail_url: string | null;
  thumbnail_bucket?: string | null;
  duration_seconds: number | null;
  reading_minutes: number | null;
  tags: string[];
  is_featured: boolean;
  required_plan_id?: string | null;
  created_at: string;
};

type ContentType = "article" | "audio" | "pdf" | "video";
type Filter = {
  types?: ContentType[];
  kinds?: string[];
  featured?: boolean;
  ids?: string[];
  search?: string;
  limit?: number;
  categoryId?: string;
};

const SELECT = "id,slug,title,subtitle,type,content_kind,thumbnail_url,thumbnail_bucket,duration_seconds,reading_minutes,tags,is_featured,required_plan_id,created_at";

export function useContent(filter: Filter = {}) {
  const [items, setItems] = useState<ContentRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    let q = supabase
      .from("content")
      .select(SELECT)
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(filter.limit ?? 60);
    if (filter.types?.length) q = q.in("type", filter.types);
    if (filter.kinds?.length) q = q.in("content_kind", filter.kinds);
    if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
    if (filter.featured) q = q.eq("is_featured", true);
    if (filter.ids?.length) q = q.in("id", filter.ids);
    if (filter.search) q = q.ilike("title", `%${filter.search}%`);
    q.then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError(error);
        setItems([]);
        return;
      }
      const signed = await Promise.all(
        ((data ?? []) as ContentRow[]).map(async (row) => {
          if (!row.thumbnail_url) return row;
          try {
            return {
              ...row,
              thumbnail_url: await getSignedUrl(row.thumbnail_bucket || "section-thumbnails", row.thumbnail_url, 3600),
            };
          } catch {
            return row;
          }
        }),
      );
      if (!cancelled) setItems(signed as ContentRow[]);
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  useEffect(() => {
    const ch = supabase
      .channel(`content-grid-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content" }, () => {
        setVersion((v) => v + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [key]);

  return { items, error };
}

export function ContentGrid({
  items,
  loading,
  emptyTitle = "Arquivo ainda em silêncio.",
  emptyDescription = "Nada publicado nesta seção. Os primeiros sinais aparecerão aqui em breve.",
  emptyEyebrow = "observatório · vazio",
  emptyAction,
  emptyIcon = "signal",
}: {
  items: ContentRow[] | null;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyEyebrow?: string;
  emptyAction?: React.ReactNode;
  emptyIcon?: React.ComponentProps<typeof EmptyState>["icon"];
}) {
  if (loading || items === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        eyebrow={emptyEyebrow}
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((c) => (
        <ContentCard key={c.id} content={c} />
      ))}
    </div>
  );
}

export function ContentCard({ content }: { content: ContentRow }) {
  return (
    <Link
      to="/app/content/$slug"
      params={{ slug: content.slug }}
      className="group block glow-on-hover focus-ring rounded-sm"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden border border-border bg-card"
        style={{
          backgroundImage: content.thumbnail_url
            ? `url(${content.thumbnail_url})`
            : "linear-gradient(135deg, oklch(0.18 0.01 270), oklch(0.13 0.005 270))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition" />
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-background/70 backdrop-blur">
            {content.content_kind || content.type}
          </span>
          {content.required_plan_id && content.required_plan_id !== "free" ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-accent/80">
              {content.required_plan_id}
            </span>
          ) : null}
          {content.is_featured ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-foreground/90 text-background">
              destaque
            </span>
          ) : null}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveButton contentId={content.id} kind="watchlist" size="sm" />
          <SaveButton contentId={content.id} kind="favorite" size="sm" />
        </div>
      </div>
      <div className="pt-4">
        <h3 className="text-sm font-medium leading-snug text-balance group-hover:text-foreground">
          {content.title}
        </h3>
        {content.subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{content.subtitle}</p>
        ) : null}
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
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

export function ContentCarousel({ title, items, loading }: { title: string; items: ContentRow[] | null; loading?: boolean }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {items?.length ?? "—"} itens
        </span>
      </div>
      {loading || items === null ? (
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[280px] shrink-0">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="mt-3 h-3 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground py-6">
          nenhum item nesta linha ainda
        </p>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
          {items.map((c) => (
            <div key={c.id} className="snap-start shrink-0 w-72">
              <ContentCard content={c} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
