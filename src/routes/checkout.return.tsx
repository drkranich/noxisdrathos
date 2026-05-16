import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Pagamento concluído — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--neon)]/10 flex items-center justify-center mb-6">
          <Check className="w-5 h-5 text-[var(--neon)]" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">acesso confirmado</p>
        <h1 className="font-display text-3xl mt-3">Bem-vindo ao Observatório.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Sua assinatura foi processada. O acesso ao acervo privado já está ativo.
        </p>
        {session_id ? (
          <p className="mt-6 font-mono text-[10px] text-muted-foreground/60 break-all">
            sessão · {session_id}
          </p>
        ) : null}
        <div className="mt-10 flex items-center justify-center gap-6">
          <Link
            to="/app"
            className="px-5 py-3 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em] hover:opacity-90"
          >
            entrar no acervo
          </Link>
          <Link
            to="/app/subscription"
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            ver assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}
