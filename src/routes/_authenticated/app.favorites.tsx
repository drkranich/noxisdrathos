import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, type ContentRow } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/favorites")({
  head: () => ({ meta: [{ title: "Favoritos — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setItems(null);
    (async () => {
      const { data: bm } = await supabase
        .from("bookmarks")
        .select("content_id")
        .eq("user_id", user.id)
        .eq("kind", "favorite");
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
        eyebrow="curadoria pessoal · favoritos"
        title="Favoritos."
        lead="O que marcou. O que voltou a fazer sentido. Sua coleção íntima dentro do observatório."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="coleção · vazia"
          emptyTitle="Nenhum favorito ainda."
          emptyDescription="Marque o que ressoa. Sua coleção privada começa com o primeiro gesto."
          emptyIcon="spark"
          emptyAction={
            <Link
              to="/app/library"
              className="font-mono text-[11px] uppercase tracking-[0.3em] underline-offset-8 hover:underline"
            >
              explorar biblioteca →
            </Link>
          }
        />
      </div>
    </div>
  );
}
