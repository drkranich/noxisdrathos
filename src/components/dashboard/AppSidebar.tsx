import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Library,
  Compass,
  Film,
  FileText,
  Headphones,
  Bookmark,
  Download,
  Users,
  Calendar,
  Heart,
  Settings,
  CreditCard,
  LifeBuoy,
  Shield,
  LogOut,
  PlusSquare,
  UploadCloud,
  Image as ImageIcon,
  FolderTree,
  Layers,
  MessageSquare,
  Megaphone,
  Activity,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

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
      { to: "/app/pdfs", label: "pdfs", icon: FileText },
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

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const initials =
    (user?.user_metadata?.display_name || user?.email || "")
      .toString()
      .split(" ")
      .map((p: string) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·";

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card/30 backdrop-blur-xl">
      <Link to="/app" className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <span className="neon-dot animate-blink" />
        <span className="font-mono text-[11px] uppercase tracking-[0.3em]">observatório</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
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
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition " +
                        (active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{it.label}</span>
                      {active ? <span className="ml-auto neon-dot" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {isAdmin ? (
          <div>
            <p className="px-3 mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              super admin
            </p>
            <ul className="space-y-0.5">
              {[
                { to: "/app/admin", label: "painel", icon: Shield, exact: true },
                { to: "/app/admin/content/new", label: "novo conteúdo", icon: PlusSquare },
                { to: "/app/admin/content", label: "conteúdos", icon: FileText },
                { to: "/app/admin/uploads", label: "uploads", icon: UploadCloud },
                { to: "/app/admin/media", label: "biblioteca mídia", icon: ImageIcon },
                { to: "/app/admin/categories", label: "categorias", icon: FolderTree },
                { to: "/app/admin/collections", label: "coleções", icon: Layers },
                { to: "/app/admin/members", label: "membros", icon: Users },
                { to: "/app/admin/comments", label: "moderação", icon: MessageSquare },
                { to: "/app/admin/announcements", label: "anúncios", icon: Megaphone },
                { to: "/app/admin/intelligence", label: "inteligência", icon: Sparkles },
                { to: "/app/admin/billing", label: "billing", icon: CreditCard },
                { to: "/app/admin/logs", label: "logs", icon: Activity },
                { to: "/app/admin/diagnostics", label: "diagnóstico", icon: Stethoscope },
              ].map((it) => {
                const Icon = it.icon;
                const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition " +
                        (active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{it.label}</span>
                      {active ? <span className="ml-auto neon-dot" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-mono text-[10px] tracking-wider">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs truncate">{user?.user_metadata?.display_name || user?.email}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              {isAdmin ? "admin" : "membro"}
            </p>
          </div>
          <NotificationBell compact />
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
