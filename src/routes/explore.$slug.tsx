import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/site/PublicShell";
import { Lock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/explore/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("content")
      .select("id,slug,title,subtitle,description,body_md,type,thumbnail_url,tags,reading_minutes,duration_seconds,publish_at")
      .eq("slug", params.slug)
      .eq("status", "published")
      .eq("visibility", "public")
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Observatório` },
          { name: "description", content: loaderData.subtitle ?? "Leitura pública do observatório." },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.subtitle ?? "" },
          ...(loaderData.thumbnail_url ? [{ property: "og:image", content: loaderData.thumbnail_url }] : []),
        ]
      : [],
  }),
  notFoundComponent: () => (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="font-display text-5xl mt-4">Esta leitura não está pública.</h1>
        <p className="mt-6 text-muted-foreground">Pode ser restrita a membros ou ainda não publicada.</p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/explore" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground pb-1">voltar à biblioteca</Link>
          <Link to="/signup" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground pb-1">solicitar acesso</Link>
        </div>
      </div>
    </PublicShell>
  ),
  errorComponent: ({ error }) => (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl">Falha ao carregar.</h1>
        <p className="mt-4 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </PublicShell>
  ),
  component: PublicContentDetail,
});

function PublicContentDetail() {
  const c = Route.useLoaderData();
  return (
    <PublicShell>
      <article className="mx-auto max-w-[1100px] px-6 md:px-10 pt-10 pb-24">
        <Link to="/explore" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground mb-10">
          <ArrowLeft className="w-3.5 h-3.5" /> biblioteca pública
        </Link>

        <header className="grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="neon-dot mr-2 inline-block align-middle" />
              leitura pública · {c.type}
            </p>
            <h1 className="font-display text-5xl md:text-6xl mt-6 leading-[0.95] text-balance">{c.title}</h1>
            {c.subtitle ? <p className="mt-6 text-lg text-muted-foreground max-w-xl">{c.subtitle}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              {(c.tags ?? []).slice(0, 6).map((t: string) => (
                <span key={t} className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground border border-border px-2 py-1">{t}</span>
              ))}
            </div>
          </div>
          {c.thumbnail_url ? (
            <div className="md:col-span-5 aspect-[4/3] bg-card overflow-hidden border border-border">
              <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
        </header>

        <div className="hairline my-16" />

        {c.description ? (
          <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl">{c.description}</p>
        ) : null}

        {c.body_md ? (
          <div className="prose prose-invert mt-10 max-w-3xl whitespace-pre-wrap text-base leading-relaxed">
            {c.body_md}
          </div>
        ) : null}

        <aside className="mt-20 border border-border p-10 md:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="flex items-start gap-4">
            <Lock className="w-5 h-5 mt-1 text-[var(--neon)]" />
            <div>
              <h3 className="font-display text-2xl">Versão completa, vídeos e PDFs estão no acervo restrito.</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Esta é uma das poucas leituras abertas. O corpo central do observatório circula apenas dentro do círculo.
              </p>
            </div>
          </div>
          <Link
            to="/pricing"
            className="font-mono text-[11px] uppercase tracking-[0.3em] border border-foreground px-6 py-4 bg-foreground text-background hover:bg-transparent hover:text-foreground transition"
          >
            ver planos →
          </Link>
        </aside>
      </article>
    </PublicShell>
  );
}
