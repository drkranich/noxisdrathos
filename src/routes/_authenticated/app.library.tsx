import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, useContent } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/library")({
  head: () => ({ meta: [{ title: "Biblioteca — Observatório" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  component: LibraryPage,
});

const TABS = [
  { key: "all", label: "tudo", types: undefined },
  { key: "video", label: "vídeos", types: ["video" as const] },
  { key: "pdf", label: "relatórios", types: ["pdf" as const] },
  { key: "audio", label: "áudios", types: ["audio" as const] },
  { key: "article", label: "artigos", types: ["article" as const] },
];

function LibraryPage() {
  const { category } = Route.useSearch();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const active = TABS.find((t) => t.key === tab)!;
  const { items, hasMore } = useContent({
    types: active.types,
    search: search || undefined,
    limit: 24,
    categoryId: category,
    page,
  });

  // Reset page when tab, search or category changes
  const handleTab = useCallback((key: string) => { setTab(key); setPage(0); }, []);
  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(0); }, []);

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="biblioteca · arquivo privado"
        title="A biblioteca."
        lead="Tudo que foi publicado fica aqui. Sem expiração, sem ruído. O acervo cresce a cada edição."
        height="sm"
      />

      <div className="px-8 lg:px-14 pt-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-4">
          <div className="flex flex-wrap gap-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTab(t.key)}
                className={`font-mono text-[11px] uppercase tracking-[0.3em] pb-1 border-b transition ${
                  tab === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="buscar no acervo"
            className="bg-transparent border-b border-border focus:border-foreground outline-none font-mono text-[11px] uppercase tracking-[0.25em] py-1 w-64"
          />
        </div>

        <ContentGrid
          items={items}
          emptyEyebrow="biblioteca · vazia"
          emptyTitle="Seu arquivo privado está em silêncio."
          emptyDescription="Nada corresponde a esta seleção ainda. Ajuste os filtros ou aguarde a próxima edição."
          emptyIcon="archive"
        />

        <div className="flex items-center justify-center gap-6 pt-4 pb-8">
          {page > 0 && (
            <button
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-5 py-2.5 hover:bg-accent transition"
            >
              ← anterior
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-5 py-2.5 hover:bg-accent transition"
            >
              próximos →
            </button>
          )}
          {!hasMore && page > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              fim do acervo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
