import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/manifesto", label: "manifesto" },
  { to: "/explore", label: "explorar" },
  { to: "/research", label: "pesquisa" },
  { to: "/about", label: "sobre" },
  { to: "/pricing", label: "acesso" },
  { to: "/faq", label: "faq" },
] as const;

export function SiteHeader() {
  const { session } = useAuth();
  return (
    <header className="fixed top-0 z-50 w-full backdrop-blur-xl bg-background/60 border-b border-border/50">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="neon-dot animate-blink" />
          <span className="font-mono text-[11px] uppercase tracking-[0.32em]">observatório</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="font-mono text-[11px] uppercase tracking-[0.3em] transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {session ? (
          <Link
            to="/app"
            className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground/40 pb-1 hover:border-[var(--neon)]"
          >
            entrar no observatório →
          </Link>
        ) : (
          <Link
            to="/signup"
            className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground/40 pb-1 hover:border-[var(--neon)]"
          >
            solicitar acesso
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 grid gap-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="neon-dot" />
            <span className="font-mono text-[11px] uppercase tracking-[0.32em]">observatório</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Inteligência privada para a nova economia. Sinais sobre IA, ativos digitais e soberania.
          </p>
        </div>
        {[
          { title: "explorar", links: [["/manifesto","manifesto"],["/explore","biblioteca pública"],["/research","pesquisa"]] },
          { title: "acesso", links: [["/pricing","planos"],["/about","sobre"],["/faq","faq"]] },
          { title: "círculo", links: [["/login","entrar"],["/signup","solicitar acesso"]] },
        ].map((c) => (
          <div key={c.title}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            edição 014 · volume privado
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacidade"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
            >
              privacidade
            </Link>
            <Link
              to="/termos"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
            >
              termos
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              © {new Date().getFullYear()} observatório
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
