import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CinematicHero } from "@/components/CinematicHero";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: AgendaPage,
});

type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  publish_at: string;
  expires_at: string | null;
  level: string;
};
type UpcomingContent = { id: string; slug: string; title: string; type: string; publish_at: string | null };

function AgendaPage() {
  const [ann, setAnn] = useState<AnnouncementRow[] | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingContent[] | null>(null);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("id,title,body,publish_at,expires_at,level")
      .eq("is_active", true)
      .order("publish_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setAnn((data ?? []) as AnnouncementRow[]));

    supabase
      .from("content")
      .select("id,slug,title,type,publish_at")
      .eq("status", "scheduled")
      .order("publish_at", { ascending: true })
      .limit(20)
      .then(({ data }) => setUpcoming((data ?? []) as UpcomingContent[]));
  }, []);

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="agenda · transmissões previstas"
        title="Agenda."
        lead="Próximas publicações, sinais agendados e anúncios privados do observatório."
        height="sm"
      />

      <div className="px-8 lg:px-14 pt-12 grid lg:grid-cols-2 gap-12 max-w-6xl">
        <section>
          <h2 className="font-display text-2xl mb-6">próximas publicações</h2>
          {upcoming === null ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              eyebrow="agenda · vazia"
              title="Sem publicações agendadas."
              description="Quando uma edição estiver prevista, ela aparecerá aqui antes do horário."
              icon="clock"
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {upcoming.map((c) => (
                <li key={c.id} className="py-5 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{c.type}</p>
                    <p className="mt-1 text-sm">{c.title}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground shrink-0">
                    {c.publish_at ? new Date(c.publish_at).toLocaleString("pt-BR") : "a definir"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl mb-6">anúncios</h2>
          {ann === null ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : ann.length === 0 ? (
            <EmptyState
              eyebrow="silêncio editorial"
              title="Nenhum anúncio ativo."
              description="O observatório está em silêncio — sinal de calma operacional."
              icon="signal"
            />
          ) : (
            <ul className="space-y-4">
              {ann.map((a) => (
                <li key={a.id} className="border border-border p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{a.level}</p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {new Date(a.publish_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base">{a.title}</h3>
                  {a.body ? <p className="mt-2 text-sm text-muted-foreground">{a.body}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
