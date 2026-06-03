import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  LayoutGrid, Library, Compass, Film, FileText, Headphones,
  Bookmark, Download, Users, Calendar, Heart, Settings,
  CreditCard, LifeBuoy, Shield, LogOut, Menu, X,
  PlusSquare, UploadCloud, Image as ImageIcon, FolderTree,
  Layers, MessageSquare, Megaphone, Activity, Sparkles,
  Stethoscope, Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_BOTTOM = [
  { to: "/app", label: "home", icon: LayoutGrid, exact: true },
  { to: "/app/discover", label: "descobrir", icon: Compass },
  { to: "/app/library", label: "biblioteca", icon: Library },
  { to: "/app/community", label: "círculo", icon: Users },
];

const groups = [
  {
    label: "feed",
    items: [
      { to: "/app", label: "home", icon: LayoutGrid, exact: true },
      { to: "/app/discover", label: "descobrir", icon: Compass },
      { to: "/app/library", label: "biblioteca", icon: Library },
    ],
  },
  {
    label: "formatos",
    items: [
      { to: "/app/videos", label: "vídeos", icon: Film },
      { to: "/app/pdfs", label: "relatórios", icon: FileText },
      { to: "/app/audios", label: "áudios", icon: Headphones },
    ],
  },
  {
    label: "pessoal",
    items: [
      { to: "/app/watchlist", label: "watchlist", icon: Bookmark },
      { to: "/app/favorites", label: "favoritos", icon: Heart },
      { to: "/app/downloads", label: "downloads", icon: Download },
    ],
  },
  {
    label: "círculo",
    items: [
      { to: "/app/community", label: "comunidade", icon: Users },
      { to: "/app/agenda", label: "agenda", icon: Calendar },
    ],
  },
  {
    label: "conta",
    items: [
      { to: "/app/subscription", label: "assinatura", icon: CreditCard },
      { to: "/app/settings", label: "configurações", icon: Settings },
      { to: "/app/support", label: "suporte", icon: LifeBuoy },
    ],
  },
];

const ADMIN_ITEMS = [
  { to: "/app/admin", label: "painel", icon: Shield, exact: true },
  { to: "/app/admin/content/new", label: "novo conteúdo", icon: PlusSquare },
  { to: "/app/admin/content", label: "conteúdos", icon: FileText },
  { to: "/app/admin/uploads", label: "uploads", icon: UploadCloud },
  { to: "/app/admin/media", label: "mídia", icon: ImageIcon },
  { to: "/app/admin/categories", label: "categorias", icon: FolderTree },
  { to: "/app/admin/collections", label: "coleções", icon: Layers },
  { to: "/app/admin/members", label: "membros", icon: Users },
  { to: "/app/admin/comments", label: "moderação", icon: MessageSquare },
  { to: "/app/admin/announcements", label: "anúncios", icon: Megaphone },
  { to: "/app/admin/intelligence", label: "inteligência", icon: Sparkles },
  { to: "/app/admin/billing", label: "billing", icon: CreditCard },
  { to: "/app/admin/logs", label: "logs", icon: Activity },
  { to: "/app/admin/diagnostics", label: "diagnóstico", icon: Stethoscope },
];

export function MobileNav() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isSuperAdmin, primaryRole, rolesLoading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fecha ao mudar de rota
  useEffect(() => { setOpen(false); }, [pathname]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Impede scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const initials =
    (user?.user_metadata?.display_name || user?.email || "")
      .toString().split(" ").map((p: string) => p[0])
      .filter(Boolean).slice(0, 2).join("").toUpperCase() || "·";

  if (!mounted) return null;

  return (
    <>
      {/* Top bar mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-xl border-b border-border">
        <Link to="/app" className="flex items-center gap-2">
          <span className="neon-dot animate-blink" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">observatório</span>
        </Link>
        <div className="flex items-center gap-3">
          <NotificationBell compact />
          <button
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground transition p-1"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Spacer para o top bar */}
      <div className="lg:hidden h-14 shrink-0" />

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer lateral */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={
          "lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/* Cabeçalho do drawer */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-border shrink-0">
          <Link to="/app" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="neon-dot animate-blink" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">observatório</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition p-1"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav scrollável */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 mb-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(it.to, it.exact);
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        className={
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition " +
                          (active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{it.label}</span>
                        {active ? <span className="ml-auto neon-dot" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Admin */}
          {!rolesLoading && isSuperAdmin && (
            <div>
              <p className="px-3 mb-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                super admin
              </p>
              <ul className="space-y-0.5">
                {ADMIN_ITEMS.map((it) => {
                  const Icon = it.icon;
                  const active = it.exact
                    ? pathname === it.to
                    : pathname === it.to || pathname.startsWith(it.to + "/");
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        className={
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition " +
                          (active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{it.label}</span>
                        {active ? <span className="ml-auto neon-dot" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* Rodapé com perfil */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-mono text-[10px] tracking-wider shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate">{user?.user_metadata?.display_name || user?.email}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                {rolesLoading ? "hidratando" : primaryRole === "none" ? "sem papel" : primaryRole}
              </p>
            </div>
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="text-muted-foreground hover:text-foreground transition p-1"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navigation bar (atalhos rápidos) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around h-14 px-2">
          {NAV_BOTTOM.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.to, it.exact);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={"flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition " +
                  (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="w-5 h-5" />
                <span className="font-mono text-[8px] uppercase tracking-[0.2em]">{it.label}</span>
                {active ? <span className="neon-dot" style={{ width: 4, height: 4 }} /> : null}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-muted-foreground hover:text-foreground transition"
            aria-label="Mais opções"
          >
            <Menu className="w-5 h-5" />
            <span className="font-mono text-[8px] uppercase tracking-[0.2em]">mais</span>
          </button>
        </div>
      </nav>

      {/* Spacer para o bottom bar */}
      <div className="lg:hidden h-14 shrink-0" />
    </>
  );
}
