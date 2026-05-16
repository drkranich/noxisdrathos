import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, type ContentRow } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: bm } = await supabase
        .from("bookmarks")
        .select("content_id")
        .eq("user_id", user.id)
        .eq("kind", "watchlist");
      const ids = (bm ?? []).map((b) => b.content_id);
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      const { data } = await supabase
        .from("content")
        .select("id,slug,title,subtitle,type,thumbnail_url,duration_seconds,reading_minutes,tags,is_featured,created_at")
        .in("id", ids);
      setItems((data ?? []) as ContentRow[]);
    })();
  }, [user?.id]);

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="reservado para depois"
        title="Watchlist."
        lead="O que ficou em pausa. O que merece atenção sem pressa."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="watchlist · vazia"
          emptyTitle="Nada reservado para depois."
          emptyDescription="Salve leituras e sessões para revisitar no próprio tempo."
          emptyIcon="clock"
          emptyAction={
            <Link to="/app/library" className="font-mono text-[11px] uppercase tracking-[0.3em] underline-offset-8 hover:underline">
              explorar biblioteca →
            </Link>
          }
        />
      </div>
    </div>
  );
}
