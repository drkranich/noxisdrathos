import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Search, LayoutGrid, Library, Compass, Film, FileText,
  Headphones, Bookmark, Heart, Download, Users, Calendar,
  Settings, CreditCard, LifeBuoy, Shield, X, ArrowRight,
  Video, Music, BookOpen,
} from "lucide-react";

type ResultItem = {
  id: string;
  kind: "route" | "content";
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  action: () => void;
};

const STATIC_ROUTES: Omit<ResultItem, "action">[] = [
  { id: "home", kind: "route", label: "Home", icon: LayoutGrid },
  { id: "discover", kind: "route", label: "Descobrir", icon: Compass },
  { id: "library", kind: "route", label: "Biblioteca", icon: Library },
  { id: "videos", kind: "route", label: "Vídeos", icon: Film },
  { id: "pdfs", kind: "route", label: "Relatórios", icon: FileText },
  { id: "audios", kind: "route", label: "Áudios", icon: Headphones },
  { id: "watchlist", kind: "route", label: "Watchlist", icon: Bookmark },
  { id: "favorites", kind: "route", label: "Favoritos", icon: Heart },
  { id: "downloads", kind: "route", label: "Downloads", icon: Download },
  { id: "community", kind: "route", label: "Comunidade", icon: Users },
  { id: "agenda", kind: "route", label: "Agenda", icon: Calendar },
  { id: "subscription", kind: "route", label: "Assinatura", icon: CreditCard },
  { id: "settings", kind: "route", label: "Configurações", icon: Settings },
  { id: "support", kind: "route", label: "Suporte", icon: LifeBuoy },
];

const ROUTE_TO_PATH: Record<string, string> = {
  home: "/app", discover: "/app/discover", library: "/app/library",
  videos: "/app/videos", pdfs: "/app/pdfs", audios: "/app/audios",
  watchlist: "/app/watchlist", favorites: "/app/favorites", downloads: "/app/downloads",
  community: "/app/community", agenda: "/app/agenda", subscription: "/app/subscription",
  settings: "/app/settings", support: "/app/support",
};

function typeIcon(type: string) {
  if (type === "video") return Video;
  if (type === "audio") return Music;
  if (type === "pdf") return FileText;
  return BookOpen;
}

export function CommandPalette() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const navigate = useCallback((path: string) => {
    router.navigate({ to: path });
    setOpen(false);
  }, [router]);

  // Abre com ⌘K ou Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Foca o input ao abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll do item selecionado
  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Busca
  useEffect(() => {
    const routes = STATIC_ROUTES
      .filter((r) => !query || r.label.toLowerCase().includes(query.toLowerCase()))
      .map((r): ResultItem => ({
        ...r,
        action: () => navigate(ROUTE_TO_PATH[r.id] ?? "/app"),
      }));

    // Admin routes
    const adminRoutes: ResultItem[] = isSuperAdmin && (!query || "admin painel cms".includes(query.toLowerCase()))
      ? [{ id: "admin", kind: "route", label: "Painel Admin", sublabel: "super admin", icon: Shield, action: () => navigate("/app/admin") }]
      : [];

    if (!query.trim()) {
      setResults([...adminRoutes, ...routes]);
      return;
    }

    // Busca em conteúdo
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("content")
        .select("id,slug,title,subtitle,type")
        .eq("status", "published")
        .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%`)
        .limit(6);

      const contentResults: ResultItem[] = (data ?? []).map((c) => ({
        id: c.id,
        kind: "content" as const,
        label: c.title,
        sublabel: c.subtitle ?? c.type,
        icon: typeIcon(c.type),
        action: () => navigate(`/app/content/${c.slug}`),
      }));

      setResults([...adminRoutes, ...routes, ...contentResults]);
      setSearching(false);
    }, 200);

    return () => { clearTimeout(timer); setSearching(false); };
  }, [query, isSuperAdmin, navigate]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((v) => Math.min(v + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && results[selected]) { results[selected].action(); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Painel */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="buscar páginas ou conteúdo…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoComplete="off"
            spellCheck={false}
          />
          {searching && <span className="neon-dot animate-blink shrink-0" />}
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resultados */}
        <ul ref={listRef} className="max-h-80 overflow-y-auto py-2" role="listbox">
          {results.length === 0 && !searching && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground font-mono text-[11px] uppercase tracking-[0.25em]">
              nenhum resultado
            </li>
          )}
          {results.map((item, idx) => {
            const Icon = item.icon;
            const active = idx === selected;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={active}
                onClick={item.action}
                className={
                  "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition " +
                  (active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate block">
                      {item.sublabel}
                    </span>
                  )}
                </div>
                {item.kind === "content" && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">
                    conteúdo
                  </span>
                )}
                {active && <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">↑↓ navegar</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">↵ abrir</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">esc fechar</span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">⌘K</span>
        </div>
      </div>
    </div>
  );
}
