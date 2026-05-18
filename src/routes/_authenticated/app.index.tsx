import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { ContentRail } from "@/components/rails/ContentRail";
import {
  getPersonalizedRails,
  type RecContent,
} from "@/lib/recommendations.functions";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: HomePage,
});

type Rails = Awaited<ReturnType<typeof getPersonalizedRails>>;

function HomePage() {
  const { user } = useAuth();
  const fetchRails = useServerFn(getPersonalizedRails);
  const [rails, setRails] = useState<Rails | null>(null);
  const [featured, setFeatured] = useState<RecContent | null>(null);
  const [hasAnyContent, setHasAnyContent] = useState<boolean | null>(null);

  async function signThumbs<T extends RecContent>(items: T[]) {
    return Promise.all(items.map(async (item) => {
      if (!item.thumbnail_url) return item;
      try {
        return { ...item, thumbnail_url: await getSignedUrl(item.thumbnail_bucket || "thumbnails", item.thumbnail_url, 3600) };
      } catch {
        return item;
      }
    }));
  }

  useEffect(() => {
    let cancelled = false;
    fetchRails()
      .then((r) => {
        if (cancelled) return;
        Promise.all([
          signThumbs(r.continueWatching),
          signThumbs(r.recommended),
          signThumbs(r.becauseYouWatched),
          signThumbs(r.trending),
          signThumbs(r.hidden),
          signThumbs(r.recentlyExplored),
        ]).then(([continueWatching, recommended, becauseYouWatched, trending, hidden, recentlyExplored]) => {
          if (!cancelled) setRails({ ...r, continueWatching, recommended, becauseYouWatched, trending, hidden, recentlyExplored });
        });
      })
      .catch(() => !cancelled && setRails({
        anchorTitle: null,
        continueWatching: [],
        recommended: [],
        becauseYouWatched: [],
        trending: [],
        hidden: [],
        recentlyExplored: [],
      }));
    supabase
      .from("content")
      .select("id,slug,title,subtitle,type,thumbnail_url,thumbnail_bucket,duration_seconds,reading_minutes,tags,is_featured,created_at,category_id")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        signThumbs(data ? [data as RecContent] : []).then((signed) => !cancelled && setFeatured(signed[0] ?? null));
        setHasAnyContent(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const greeting = (user?.user_metadata?.display_name || user?.email?.split("@")[0] || "membro").toString();

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
                to="/app/discover"
                className="inline-flex items-center gap-2 px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent transition"
              >
                descobrir
              </Link>
            </>
          ) : null
        }
      />

      <div className="px-6 lg:px-14 pt-12 space-y-14">
        <ContentRail
          title="continue assistindo"
          subtitle="retome onde parou"
          items={rails?.continueWatching ?? null}
          loading={rails === null}
        />
        {rails && rails.becauseYouWatched.length > 0 && rails.anchorTitle ? (
          <ContentRail
            title="porque você acompanhou"
            subtitle={`em diálogo com · ${rails.anchorTitle.toLowerCase()}`}
            items={rails.becauseYouWatched}
          />
        ) : null}
        <ContentRail
          title="recomendado para você"
          subtitle="curadoria personalizada"
          items={rails?.recommended ?? null}
          loading={rails === null}
        />
        <ContentRail
          title="em circulação"
          subtitle="o que está sendo lido no círculo"
          items={rails?.trending ?? null}
          loading={rails === null}
        />
        <ContentRail
          title="descobertas silenciosas"
          subtitle="gemas pouco percorridas"
          items={rails?.hidden ?? null}
          loading={rails === null}
        />
        <ContentRail
          title="recentemente explorado"
          subtitle="seu rastro no observatório"
          items={rails?.recentlyExplored ?? null}
          loading={rails === null}
        />

        {hasAnyContent === false ? (
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
