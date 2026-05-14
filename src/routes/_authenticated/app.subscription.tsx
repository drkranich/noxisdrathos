import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BillingService, formatMoney, type Invoice, type Membership } from "@/lib/billing/service";
import { PLANS } from "@/lib/billing/plans";
import { Check, ExternalLink, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "Assinatura — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    BillingService.getMembership(user.id).then(setMembership);
    BillingService.listInvoices(user.id).then(setInvoices);
  }, [user]);

  async function upgrade(planId: typeof PLANS[number]["id"]) {
    setMsg(null);
    const r = await BillingService.startCheckout(planId);
    if (r.ok) window.location.href = r.url;
    else setMsg(r.message);
  }

  const currentPlan = membership?.plan ?? "free";

  return (
    <div className="px-8 lg:px-14 py-12 max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">conta · assinatura</p>
      <h1 className="font-display text-4xl mt-3">Sua assinatura.</h1>
      <p className="mt-4 text-muted-foreground max-w-xl">
        Gerencie seu plano, métodos de pagamento e histórico de faturas.
      </p>

      <section className="mt-10 border border-border p-8 grid md:grid-cols-3 gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">plano atual</p>
          <p className="font-display text-3xl mt-2 capitalize">{currentPlan}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">status</p>
          <p className="font-display text-3xl mt-2 capitalize">{membership?.status ?? "inativo"}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">próxima renovação</p>
          <p className="font-display text-xl mt-2">
            {membership?.current_period_end
              ? new Date(membership.current_period_end).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
      </section>

      <h2 className="font-display text-2xl mt-16 mb-6">
        <Sparkles className="inline w-5 h-5 mr-2 text-[var(--neon)]" />
        Planos disponíveis
      </h2>
      <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div key={p.id} className={"bg-background p-8 " + (p.featured ? "ring-1 ring-[var(--neon)]/40" : "")}>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{p.tag}</p>
              <h3 className="font-display text-3xl mt-3">{p.name}</h3>
              <p className="mt-4 font-display text-4xl">
                {p.price}<span className="text-muted-foreground text-base">{p.period}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              <ul className="mt-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--neon)]" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                onClick={() => upgrade(p.id)}
                className={
                  "mt-8 w-full px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition " +
                  (isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "bg-foreground text-background hover:opacity-90")
                }
              >
                {isCurrent ? "plano atual" : p.cta}
              </button>
            </div>
          );
        })}
      </div>
      {msg ? <p className="mt-4 font-mono text-[11px] text-muted-foreground">{msg}</p> : null}

      <h2 className="font-display text-2xl mt-16 mb-6">Histórico de faturas</h2>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">data</th>
              <th className="text-left p-4">valor</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">provedor</th>
              <th className="p-4 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border/50">
                <td className="p-4">{new Date(inv.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-4 font-mono">{formatMoney(inv.amount_cents, inv.currency)}</td>
                <td className="p-4 capitalize">{inv.status}</td>
                <td className="p-4 font-mono text-xs uppercase">{inv.provider}</td>
                <td className="p-4 text-right">
                  {inv.pdf_url ? (
                    <a href={inv.pdf_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      pdf <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground text-sm">Nenhuma fatura ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        provedor de pagamento ainda não conectado · checkout em modo silencioso
      </p>

      <div className="mt-4">
        <Link to="/pricing" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground/40 pb-1">
          ver detalhes públicos dos planos →
        </Link>
      </div>
    </div>
  );
}
