import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentCarousel, type ContentRow } from "@/components/ContentGrid";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentRow[] | null>(null);
  const [continueIds, setContinueIds] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("content")
      .select("id,slug,title,subtitle,type,thumbnail_url,duration_seconds,reading_minutes,tags,is_featured,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setItems((data ?? []) as ContentRow[]));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("watch_history")
      .select("content_id,last_seen_at,completed")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("last_seen_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setContinueIds((data ?? []).map((r) => r.content_id)));
  }, [user?.id]);

  const featured = items?.find((i) => i.is_featured) ?? items?.[0] ?? null;
  const greeting = (user?.user_metadata?.display_name || user?.email?.split("@")[0] || "membro").toString();

  const newest = items?.slice(0, 12) ?? null;
  const reports = items?.filter((c) => c.type === "pdf" || c.type === "article").slice(0, 12) ?? null;
  const videos = items?.filter((c) => c.type === "video").slice(0, 12) ?? null;
  const featuredRow = items?.filter((c) => c.is_featured).slice(0, 12) ?? null;
  const continueRow = items && continueIds.length
    ? continueIds.map((id) => items.find((c) => c.id === id)).filter(Boolean) as ContentRow[]
    : items
    ? []
    : null;

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow={`bem-vindo, ${greeting.toLowerCase()} · edição em curso`}
        title={featured?.title ?? "O observatório está em silêncio."}
        lead={
          featured?.subtitle ??
          "Conteúdo será publicado pelo curador em breve. Volte logo."
        }
        backgroundUrl={featured?.thumbnail_url ?? null}
        height="lg"
        actions={
          featured ? (
            <>
              <Link
                to="/explore/$slug"
                params={{ slug: featured.slug }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em] hover:opacity-90 transition"
              >
                abrir →
              </Link>
              <Link
                to="/app/library"
                className="inline-flex items-center gap-2 px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent transition"
              >
                biblioteca
              </Link>
            </>
          ) : null
        }
      />

      <div className="px-8 lg:px-14 pt-12 space-y-12">
        {continueRow && continueRow.length > 0 ? (
          <ContentCarousel title="continue assistindo" items={continueRow} />
        ) : null}
        <ContentCarousel title="destaques" items={featuredRow} />
        <ContentCarousel title="recém publicados" items={newest} />
        <ContentCarousel title="dossiês & artigos" items={reports} />
        <ContentCarousel title="vídeos" items={videos} />

        {items !== null && items.length === 0 ? (
          <EmptyState
            eyebrow="biblioteca em construção"
            title="O observatório ainda não publicou."
            description="Os primeiros sinais aparecerão aqui assim que forem liberados pelo curador."
            icon="signal"
          />
        ) : null}
      </div>
    </div>
  );
}
