import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { PLANS } from "@/lib/billing/plans";

export const Route = createFileRoute("/_authenticated/app/admin/billing")({
  head: () => ({ meta: [{ title: "CMS — Billing" }, { name: "robots", content: "noindex" }] }),
  component: AdminBilling,
});

type Sub = {
  id: string;
  user_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  created_at: string;
};

function planNameFromPriceId(priceId: string): string {
  const plan = PLANS.find((p) => p.stripePriceId === priceId);
  return plan?.name ?? priceId;
}

function priceAmountCentsFromPriceId(priceId: string): number {
  // Mirror of the catalog created in Stripe — keeps MRR math local.
  if (priceId === "circle_monthly") return 9700;
  if (priceId === "vault_monthly") return 29700;
  if (priceId === "council_yearly") return 149000 / 12; // amortized monthly
  return 0;
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function AdminBilling() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const env = getStripeEnvironment();

  useEffect(() => {
    supabase
      .from("subscriptions")
      .select("id,user_id,price_id,status,current_period_end,cancel_at_period_end,environment,created_at")
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setSubs((data ?? []) as Sub[]);
        setLoading(false);
      });
  }, [env]);

  const active = subs.filter((s) => ["active", "trialing"].includes(s.status));
  const pastDue = subs.filter((s) => s.status === "past_due");
  const canceled = subs.filter((s) => s.status === "canceled");
  const mrrCents = active.reduce((sum, s) => sum + priceAmountCentsFromPriceId(s.price_id), 0);

  // Plan distribution
  const distribution = PLANS.map((p) => ({
    name: p.name,
    count: active.filter((s) => s.price_id === p.stripePriceId).length,
  }));

  return (
    <div className="px-8 lg:px-14 py-12">
      <div className="flex items-baseline gap-4 mb-8">
        <h2 className="font-display text-3xl">Operações financeiras</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ambiente · {env}
        </span>
      </div>

      <div className="grid md:grid-cols-4 gap-px bg-border border border-border mb-10">
        <Stat label="ativas" value={String(active.length)} />
        <Stat label="mrr estimada" value={formatBRL(mrrCents)} />
        <Stat label="inadimplentes" value={String(pastDue.length)} tone={pastDue.length > 0 ? "warn" : undefined} />
        <Stat label="canceladas" value={String(canceled.length)} />
      </div>

      <div className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          distribuição por plano
        </p>
        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {distribution.map((d) => (
            <div key={d.name} className="bg-background p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{d.name}</p>
              <p className="font-display text-2xl mt-1">{d.count}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
        últimas assinaturas
      </p>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">data</th>
              <th className="text-left p-4">usuário</th>
              <th className="text-left p-4">plano</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">próxima renovação</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="p-4">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-4 font-mono text-[10px] truncate max-w-[200px]">{s.user_id}</td>
                <td className="p-4">{planNameFromPriceId(s.price_id)}</td>
                <td className="p-4">
                  <span className={
                    "font-mono text-[10px] uppercase tracking-[0.25em] " +
                    (s.status === "active" || s.status === "trialing"
                      ? "text-[var(--neon)]"
                      : s.status === "past_due"
                      ? "text-amber-500"
                      : "text-muted-foreground")
                  }>
                    {s.status}
                    {s.cancel_at_period_end ? " · agendado" : ""}
                  </span>
                </td>
                <td className="p-4">
                  {s.current_period_end
                    ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
              </tr>
            ))}
            {!loading && subs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground text-sm">
                  Nenhuma assinatura ainda. Assim que o primeiro pagamento for processado, ele aparece aqui em tempo real.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="bg-background p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className={"font-display text-4xl mt-2 " + (tone === "warn" ? "text-amber-500" : "")}>{value}</p>
    </div>
  );
}
