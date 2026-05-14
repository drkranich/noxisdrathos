import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explorar — Observatório" },
      { name: "description", content: "Prévias públicas da biblioteca privada." },
      { property: "og:title", content: "Explorar — Observatório" },
      { property: "og:description", content: "Prévias públicas da biblioteca privada." },
    ],
  }),
  component: ExplorePage,
});

type Item = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: string;
  thumbnail_url: string | null;
  tags: string[];
};

const TEASERS: Item[] = [
  { id: "t1", slug: "#", title: "Mapas de liquidez global em 2026", subtitle: "Briefing macro · 18 min", type: "article", thumbnail_url: null, tags: ["macro","liquidez"] },
  { id: "t2", slug: "#", title: "Agentes de IA em fluxos operacionais privados", subtitle: "Documento interno · 32 pp", type: "pdf", thumbnail_url: null, tags: ["ia","automação"] },
  { id: "t3", slug: "#", title: "Custódia soberana — guia visual", subtitle: "Vídeo · 24 min", type: "video", thumbnail_url: null, tags: ["soberania","ativos"] },
  { id: "t4", slug: "#", title: "Arquiteturas descentralizadas pós-2025", subtitle: "Pesquisa · 45 min", type: "article", thumbnail_url: null, tags: ["defi","economia"] },
  { id: "t5", slug: "#", title: "Sistemas pessoais de alavancagem", subtitle: "Briefing · 12 min", type: "article", thumbnail_url: null, tags: ["automação"] },
  { id: "t6", slug: "#", title: "Sinais semanais — edição 014", subtitle: "Volume privado", type: "pdf", thumbnail_url: null, tags: ["sinais"] },
];

function ExplorePage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    supabase
      .from("content")
      .select("id, slug, title, subtitle, type, thumbnail_url, tags")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, []);

  const list = items.length > 0 ? items : TEASERS;
  const usingTeasers = items.length === 0;

  return (
    <PublicShell>
      <PageHeader
        eyebrow="biblioteca · prévias"
        title="Uma fração do que vive dentro do observatório."
        lead="Estes são fragmentos públicos. O corpo completo de pesquisa é restrito a membros."
      />

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24">
        {usingTeasers ? (
          <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            mostrando amostras editoriais · novas leituras públicas em breve
          </p>
        ) : null}

        <div className="grid gap-px bg-border border border-border md:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => {
            const isReal = !usingTeasers && it.slug && it.slug !== "#";
            const Wrapper = ({ children }: { children: React.ReactNode }) =>
              isReal ? (
                <Link to="/explore/$slug" params={{ slug: it.slug }} className="bg-background group block">{children}</Link>
              ) : (
                <Link to="/pricing" className="bg-background group block">{children}</Link>
              );
            return (
            <Wrapper key={it.id}>
              <div className="aspect-[16/10] relative overflow-hidden bg-card">
                {it.thumbnail_url ? (
                  <img src={it.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                ) : (
                  <div className="absolute inset-0 grid-lines opacity-10" />
                )}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1">
                  {it.type}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl leading-tight">{it.title}</h3>
                {it.subtitle ? (
                  <p className="mt-2 text-sm text-muted-foreground">{it.subtitle}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {it.tags.slice(0, 3).map((t) => (
                    <span key={t} className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground border border-border px-2 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 border border-border p-10 md:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="flex items-start gap-4">
            <Lock className="w-5 h-5 mt-1 text-[var(--neon)]" />
            <div>
              <h3 className="font-display text-2xl">O acervo completo é restrito.</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Documentos integrais, vídeos privados, briefings semanais e arquivos de pesquisa
                estão disponíveis apenas para membros do círculo.
              </p>
            </div>
          </div>
          <Link
            to="/signup"
            className="font-mono text-[11px] uppercase tracking-[0.3em] border border-foreground px-6 py-4 bg-foreground text-background hover:bg-transparent hover:text-foreground transition"
          >
            solicitar acesso →
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
