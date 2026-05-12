import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Play, Bookmark, Heart, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: HomePage,
});

type Content = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  reading_minutes: number | null;
  tags: string[];
  is_featured: boolean;
};

const ROWS = [
  { title: "destaques", filter: (c: Content) => c.is_featured },
  { title: "novos relatórios", filter: (c: Content) => c.type === "pdf" || c.type === "article" },
  { title: "estratégias da semana", filter: () => true },
  { title: "ia & automação", filter: (c: Content) => c.tags.some((t) => /ia|automa/i.test(t)) },
  { title: "ativos digitais", filter: (c: Content) => c.tags.some((t) => /ativo|cripto|token/i.test(t)) },
  { title: "economia descentralizada", filter: (c: Content) => c.tags.some((t) => /descentral|defi|economia/i.test(t)) },
];

function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [active, setActive] = useState<Content | null>(null);

  useEffect(() => {
    supabase
      .from("content")
      .select("id,slug,title,subtitle,description,type,thumbnail_url,duration_seconds,reading_minutes,tags,is_featured")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setItems((data ?? []) as Content[]));
  }, []);

  const featured = items.find((i) => i.is_featured) ?? items[0];
  const greeting = (user?.user_metadata?.display_name || user?.email?.split("@")[0] || "membro").toString();

  return (
    <div className="pb-24">
      {/* Hero cinematográfico */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: featured?.thumbnail_url
              ? `linear-gradient(180deg, transparent 0%, var(--background) 100%), url(${featured.thumbnail_url})`
              : "radial-gradient(ellipse 80% 60% at 30% 30%, oklch(0.88 0.22 145 / 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 90%, oklch(0.88 0.22 145 / 0.10), transparent 60%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="grid-lines absolute inset-0 -z-10 opacity-[0.04]" />
        <div className="relative h-full flex flex-col justify-end px-8 lg:px-14 pb-12 max-w-5xl">
          <div className="flex items-center gap-3">
            <span className="neon-dot animate-blink" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              edição em curso · {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            bem-vindo, {greeting.toLowerCase()}
          </p>
          <h1 className="font-display text-5xl md:text-7xl mt-3 text-balance leading-[0.95]">
            {featured?.title ?? "O observatório está em silêncio."}
          </h1>
          {featured?.subtitle ? (
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">{featured.subtitle}</p>
          ) : (
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">
              Conteúdo será publicado pelo curador em breve. Volte logo.
            </p>
          )}
          {featured ? (
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setActive(featured)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em] hover:opacity-90 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> assistir
              </button>
              <button
                onClick={() => setActive(featured)}
                className="inline-flex items-center gap-2 px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent transition"
              >
                <Bookmark className="w-3.5 h-3.5" /> salvar
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Carrosséis */}
      <div className="px-8 lg:px-14 pt-12 space-y-12">
        {ROWS.map((row) => {
          const filtered = items.filter(row.filter).slice(0, 12);
          if (filtered.length === 0) return null;
          return (
            <section key={row.title}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display text-2xl">{row.title}</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {filtered.length} itens
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
                {filtered.map((c) => (
                  <ContentCard key={c.id} content={c} onOpen={() => setActive(c)} />
                ))}
              </div>
            </section>
          );
        })}

        {items.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              biblioteca em construção
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Os primeiros sinais aparecerão aqui assim que forem publicados pelo curador.
            </p>
          </div>
        ) : null}
      </div>

      {active ? <ContentModal content={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}

function ContentCard({ content, onOpen }: { content: Content; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="snap-start shrink-0 w-72 text-left group"
    >
      <div
        className="relative aspect-video overflow-hidden border border-border bg-card"
        style={{
          backgroundImage: content.thumbnail_url
            ? `url(${content.thumbnail_url})`
            : "linear-gradient(135deg, oklch(0.18 0.01 270), oklch(0.13 0.005 270))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition" />
        <div className="absolute top-2 left-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 bg-background/70 backdrop-blur">
            {content.type}
          </span>
        </div>
      </div>
      <h3 className="mt-3 text-sm font-medium leading-snug text-balance group-hover:text-foreground">
        {content.title}
      </h3>
      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <Clock className="w-3 h-3" />
        {content.duration_seconds
          ? `${Math.round(content.duration_seconds / 60)} min`
          : content.reading_minutes
          ? `${content.reading_minutes} min de leitura`
          : "—"}
      </div>
    </button>
  );
}

function ContentModal({ content, onClose }: { content: Content; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-card border border-border max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="aspect-video w-full"
          style={{
            backgroundImage: content.thumbnail_url
              ? `url(${content.thumbnail_url})`
              : "linear-gradient(135deg, oklch(0.18 0.01 270), oklch(0.13 0.005 270))",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] px-2 py-1 bg-accent">
              {content.type}
            </span>
            {content.tags.slice(0, 3).map((t) => (
              <span key={t} className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                · {t}
              </span>
            ))}
          </div>
          <h2 className="font-display text-3xl text-balance">{content.title}</h2>
          {content.subtitle ? (
            <p className="mt-3 text-sm text-muted-foreground">{content.subtitle}</p>
          ) : null}
          {content.description ? (
            <p className="mt-6 text-sm leading-relaxed">{content.description}</p>
          ) : null}
          <div className="mt-8 flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-5 py-3 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em]">
              <Play className="w-3.5 h-3.5 fill-current" /> assistir
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent">
              <Bookmark className="w-3.5 h-3.5" /> salvar
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent">
              <Heart className="w-3.5 h-3.5" /> favoritar
            </button>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            fechar ✕
          </button>
        </div>
      </div>
    </div>
  );
}
