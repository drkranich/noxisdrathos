import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, type ContentRow } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/downloads")({
  head: () => ({ meta: [{ title: "Downloads — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentRow[] | null>(null);

  // "Downloads" = PDFs marcados via bookmark kind=download (futuro: tabela própria)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: bm } = await supabase
        .from("bookmarks")
        .select("content_id")
        .eq("user_id", user.id)
        .eq("kind", "download");
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
        eyebrow="acervo offline"
        title="Downloads."
        lead="Documentos baixados para leitura privada. Acesso protegido por sessão."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="acervo offline · vazio"
          emptyTitle="Nenhum download por enquanto."
          emptyDescription="Marque dossiês para tê-los disponíveis em sessões posteriores."
          emptyIcon="archive"
          emptyAction={
            <Link to="/app/pdfs" className="font-mono text-[11px] uppercase tracking-[0.3em] underline-offset-8 hover:underline">
              ver dossiês →
            </Link>
          }
        />
      </div>
    </div>
  );
}
