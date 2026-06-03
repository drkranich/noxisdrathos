import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Lock, FileText, Headphones, Heart, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { useBookmark } from "@/hooks/useBookmark";
import { useWatchProgress } from "@/hooks/useWatchProgress";

export const Route = createFileRoute("/_authenticated/app/content/$slug")({
  head: () => ({ meta: [{ title: "Conteúdo — Observatório" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("content")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  component: MemberContentDetail,
});

type AssetState = {
  thumb?: string | null;
  banner?: string | null;
  primary?: string | null;
  trailer?: string | null;
  locked?: boolean;
  error?: string | null;
};

function MemberContentDetail() {
  const c = Route.useLoaderData();
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetState>({});

  // Verifica plano do membro antes de gerar signed URLs
  useEffect(() => {
    let cancelled = false;
    async function sign() {
      const next: AssetState = { locked: false, error: null };
      try {
        // Verificação de acesso premium
        if (c.required_plan_id && c.required_plan_id !== "free" && user?.id) {
          const { data: membership } = await supabase
            .from("memberships")
            .select("plan, status")
            .eq("user_id", user.id)
            .maybeSingle();

          const planRank: Record<string, number> = { free: 0, circle: 1, vault: 2, council: 3 };
          const userRank = planRank[membership?.plan ?? "free"] ?? 0;
          const requiredRank = planRank[c.required_plan_id] ?? 1;
          const hasAccess =
            (membership?.status === "active" || membership?.status === "trialing") &&
            userRank >= requiredRank;

          if (!hasAccess) {
            next.locked = true;
            next.error = `Conteúdo exclusivo do plano ${c.required_plan_id}.`;
            if (!cancelled) setAssets(next);
            return;
          }
        }

        // Gera signed URLs apenas se tiver acesso
        if (c.thumbnail_url) next.thumb = await getSignedUrl(c.thumbnail_bucket || "section-thumbnails", c.thumbnail_url, 3600);
        if (c.banner_path && c.banner_bucket) next.banner = await getSignedUrl(c.banner_bucket, c.banner_path, 3600);
        if (c.trailer_path && c.trailer_bucket) next.trailer = await getSignedUrl(c.trailer_bucket, c.trailer_path, 3600);
        if (c.storage_path && c.storage_bucket) next.primary = await getSignedUrl(c.storage_bucket, c.storage_path, 3600);
      } catch (e) {
        next.locked = true;
        next.error = e instanceof Error ? e.message : "Acesso restrito ao arquivo.";
      }
      if (!cancelled) setAssets(next);
    }
    sign();
    return () => { cancelled = true; };
  }, [c.id, user?.id]);

  const hero = assets.banner || assets.thumb;
  const tags = useMemo(() => ((c.tags ?? []) as string[]).slice(0, 8), [c.tags]);

  // SaveButtons
  const favBookmark = useBookmark(c.id, "favorite");
  const watchlistBookmark = useBookmark(c.id, "watchlist");

  // Watch progress
  useWatchProgress(assets.locked ? null : c.id, c.type as "video" | "audio" | "pdf" | "article");

  return (
    <div className="pb-24">
      <section className="relative min-h-[52vh] border-b border-border overflow-hidden">
        {hero ? <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative px-8 lg:px-14 pt-10 pb-14 max-w-5xl">
          <Link to="/app/library" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground mb-16">
            <ArrowLeft className="w-3.5 h-3.5" /> biblioteca
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {c.content_kind ?? c.type} · {c.required_plan_id === "free" ? "liberado" : c.required_plan_id}
          </p>
          <h1 className="font-display text-5xl md:text-7xl mt-5 leading-[0.92] text-balance">{c.title}</h1>
          {c.subtitle ? <p className="mt-6 text-lg text-muted-foreground max-w-2xl">{c.subtitle}</p> : null}
          <div className="mt-7 flex flex-wrap gap-2">
            {tags.map((tag: string) => (
              <span key={tag} className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="px-8 lg:px-14 pt-10 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10">
        <div className="space-y-8">
          <MediaBlock
            type={c.type}
            url={assets.primary}
            locked={assets.locked}
            title={c.title}
            contentId={c.id}
          />
          {c.description ? <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl">{c.description}</p> : null}
          {c.body_md ? (
            <article className="prose prose-invert max-w-3xl">
              <MarkdownBody content={c.body_md} />
            </article>
          ) : null}
          {assets.trailer ? (
            <section className="border border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">prévia</p>
              <video src={assets.trailer} controls className="w-full bg-card" />
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {/* Save buttons */}
          <div className="border border-border bg-card/40 p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">salvar</p>
            <button
              onClick={favBookmark.toggle}
              disabled={favBookmark.loading}
              className={`flex items-center gap-3 w-full font-mono text-[11px] uppercase tracking-[0.25em] px-3 py-2 border transition ${
                favBookmark.saved ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${favBookmark.saved ? "fill-current" : ""}`} />
              {favBookmark.saved ? "favoritado" : "favoritar"}
            </button>
            <button
              onClick={watchlistBookmark.toggle}
              disabled={watchlistBookmark.loading}
              className={`flex items-center gap-3 w-full font-mono text-[11px] uppercase tracking-[0.25em] px-3 py-2 border transition ${
                watchlistBookmark.saved ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${watchlistBookmark.saved ? "fill-current" : ""}`} />
              {watchlistBookmark.saved ? "na watchlist" : "watchlist"}
            </button>
          </div>

          {/* Access state */}
          <div className="border border-border bg-card/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">estado de acesso</p>
            <p className="mt-3 text-sm">{assets.locked ? "Arquivo protegido pelo plano." : "Acesso autenticado validado."}</p>
            {assets.error ? <p className="mt-2 text-xs text-muted-foreground">{assets.error}</p> : null}
          </div>

          {assets.primary && !assets.locked ? (
            <a
              href={assets.primary}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 border border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent transition"
            >
              <Download className="w-4 h-4" /> abrir arquivo
            </a>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

// Renderizador de markdown simples sem dependência externa
// Suporta: headings, bold, italic, listas, links, code inline, hr
function MarkdownBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={idx}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={idx}>{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={idx}>{part.slice(1, -1)}</code>;
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) return <a key={idx} href={linkMatch[2]} target="_blank" rel="noreferrer">{linkMatch[1]}</a>;
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{listItems}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{listItems}</ol>);
      continue;
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(<hr key={i} />);
    } else if (line.trim() === "") {
      // skip empty lines (prose handles spacing)
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

function MediaBlock({
  type, url, locked, title, contentId,
}: {
  type: string;
  url?: string | null;
  locked?: boolean;
  title: string;
  contentId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { tick } = useWatchProgress(locked ? null : contentId, type as "video" | "audio" | "pdf" | "article");

  if (locked) {
    return (
      <div className="aspect-video border border-border bg-card grid place-items-center text-center p-8">
        <Lock className="w-7 h-7 text-muted-foreground mb-3" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">conteúdo bloqueado pelo plano</p>
      </div>
    );
  }
  if (!url) return null;
  if (type === "video") {
    return (
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        className="w-full bg-card border border-border"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          tick(v.currentTime, v.duration || undefined);
        }}
      />
    );
  }
  if (type === "audio") {
    return (
      <div className="border border-border bg-card p-8">
        <Headphones className="w-6 h-6 mb-5 text-muted-foreground" />
        <audio
          src={url}
          controls
          className="w-full"
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            tick(a.currentTime, a.duration || undefined);
          }}
        />
      </div>
    );
  }
  if (type === "pdf") return <iframe src={url} title={title} className="w-full min-h-[76vh] border border-border bg-card" />;
  return (
    <div className="border border-border bg-card p-8 flex items-center gap-3 text-muted-foreground">
      <FileText className="w-5 h-5" /> artigo editorial
    </div>
  );
}
