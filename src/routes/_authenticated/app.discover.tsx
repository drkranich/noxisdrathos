import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RailCard } from "@/components/rails/ContentRail";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import type { RecContent } from "@/lib/recommendations.functions";

export const Route = createFileRoute("/_authenticated/app/discover")({
  head: () => ({ meta: [{ title: "Descobrir — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: DiscoverPage,
});

type Category = { id: string; name: string; slug: string; description: string | null };

const SELECT_COLS =
  "id,slug,title,subtitle,type,thumbnail_url,duration_seconds,reading_minutes,tags,is_featured,created_at,category_id";

function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [allContent, setAllContent] = useState<RecContent[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RecContent[] | null>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug,description")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setCategories((data ?? []) as Category[]));
    supabase
      .from("content")
      .select(SELECT_COLS)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setAllContent((data ?? []) as RecContent[]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const pattern = `%${debounced}%`;
    supabase
      .from("content")
      .select(SELECT_COLS)
      .eq("status", "published")
      .or(`title.ilike.${pattern},subtitle.ilike.${pattern}`)
      .limit(40)
      .then(({ data }) => {
        if (cancelled) return;
        setSearchResults((data ?? []) as RecContent[]);
        setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const tagBuckets = useMemo(() => {
    if (!allContent) return null;
    const counts = new Map<string, number>();
    allContent.forEach((c) => c.tags?.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
  }, [allContent]);

  const matchedTags = useMemo(() => {
    if (!debounced || !tagBuckets) return [];
    const q = debounced.toLowerCase();
    return tagBuckets.filter(([t]) => t.toLowerCase().includes(q)).slice(0, 8);
  }, [debounced, tagBuckets]);

  const matchedCategories = useMemo(() => {
    if (!debounced || !categories) return [];
    const q = debounced.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q)).slice(0, 6);
  }, [debounced, categories]);

  return (
    <div className="pb-24">
      <div className="px-6 lg:px-14 pt-12 pb-10 border-b border-border">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          descobrir · arquivo vivo
        </div>
        <h1 className="font-display text-5xl lg:text-7xl mt-3 lowercase tracking-tight text-balance">
          o que você ainda não percorreu
        </h1>
        <div className="mt-8 relative max-w-2xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar dossiês, ensaios, vídeos, tags…"
            className="w-full bg-transparent border-b border-border focus:border-foreground/60 outline-none py-3 pr-10 font-display text-2xl lowercase placeholder:text-muted-foreground/60 transition-colors"
          />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {searching ? "buscando…" : "↵"}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-14 pt-10 space-y-14">
        {debounced ? (
          <>
            {matchedCategories.length > 0 || matchedTags.length > 0 ? (
              <section className="space-y-4">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  pistas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {matchedCategories.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1.5 border border-border text-xs lowercase hover:bg-accent transition"
                    >
                      categoria · {c.name}
                    </span>
                  ))}
                  {matchedTags.map(([t, n]) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 border border-border text-xs lowercase font-mono tracking-wide hover:bg-accent transition"
                    >
                      #{t} <span className="text-muted-foreground">· {n}</span>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-4">
              <h2 className="font-display text-2xl lowercase">resultados</h2>
              {searchResults === null ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <EmptyState
                  eyebrow="silêncio"
                  title={`nada encontrado para "${debounced}"`}
                  description="tente uma palavra mais ampla ou explore por categoria abaixo."
                  icon="signal"
                />
              ) : (
                <div className="flex flex-wrap gap-5">
                  {searchResults.map((c) => (
                    <RailCard key={c.id} content={c} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl lowercase">categorias</h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    territórios do arquivo
                  </p>
                </div>
              </div>
              {categories === null ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[5/3] w-full" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <EmptyState
                  eyebrow="ainda sem categorias"
                  title="o curador está organizando os territórios"
                  description="categorias e coleções aparecerão aqui em breve."
                  icon="signal"
                />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((c) => {
                    const count = allContent?.filter((x) => x.category_id === c.id).length ?? 0;
                    return (
                      <Link
                        key={c.id}
                        to="/app/library"
                        className="group relative aspect-[5/3] border border-border p-4 flex flex-col justify-between hover:border-foreground/40 hover:bg-accent/30 transition-all duration-500 focus-ring"
                      >
                        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                          {count} {count === 1 ? "peça" : "peças"}
                        </div>
                        <div>
                          <div className="font-display text-xl lowercase group-hover:translate-x-0.5 transition-transform">
                            {c.name}
                          </div>
                          {c.description ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {tagBuckets && tagBuckets.length > 0 ? (
              <section className="space-y-4">
                <h2 className="font-display text-2xl lowercase">léxico em circulação</h2>
                <div className="flex flex-wrap gap-2">
                  {tagBuckets.map(([t, n]) => (
                    <button
                      key={t}
                      onClick={() => setQuery(t)}
                      className="px-3 py-1.5 border border-border text-xs lowercase font-mono tracking-wide hover:bg-accent hover:border-foreground/40 transition"
                    >
                      #{t} <span className="text-muted-foreground">· {n}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
