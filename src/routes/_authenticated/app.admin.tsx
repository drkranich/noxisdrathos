import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Admin — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // wait for roles to load (roles is empty until fetched)
    if (loading) return;
    if (roles.length > 0 && !isAdmin) navigate({ to: "/app", replace: true });
  }, [loading, roles, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="px-8 lg:px-14 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">acesso restrito</p>
        <h1 className="font-display text-3xl mt-4">Verificando privilégios…</h1>
      </div>
    );
  }

  const tabs = [
    { to: "/app/admin", label: "dashboard", exact: true },
    { to: "/app/admin/content", label: "conteúdo" },
    { to: "/app/admin/categories", label: "categorias" },
    { to: "/app/admin/members", label: "membros" },
    { to: "/app/admin/comments", label: "moderação" },
  ];

  return (
    <div>
      <header className="border-b border-border px-8 lg:px-14 py-6 flex items-center gap-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">painel · admin</p>
          <h1 className="font-display text-2xl mt-1">Sala de controle</h1>
        </div>
        <nav className="ml-auto flex gap-1">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={
                  "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] " +
                  (active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
