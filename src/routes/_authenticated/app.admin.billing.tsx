import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/billing/service";

export const Route = createFileRoute("/_authenticated/app/admin/billing")({
  head: () => ({ meta: [{ title: "CMS — Billing" }, { name: "robots", content: "noindex" }] }),
  component: AdminBilling,
});

type Inv = {
  id: string; user_id: string; amount_cents: number; currency: string;
  status: string; provider: string; created_at: string;
};
type Mem = { user_id: string; plan: string; status: string };

function AdminBilling() {
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [memberships, setMemberships] = useState<Mem[]>([]);

  useEffect(() => {
    supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setInvoices((data ?? []) as Inv[]));
    supabase.from("memberships").select("user_id,plan,status")
      .then(({ data }) => setMemberships((data ?? []) as Mem[]));
  }, []);

  const mrr = memberships.filter((m) => m.status === "active" || m.status === "trialing").length;
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount_cents, 0);

  return (
    <div className="px-8 lg:px-14 py-12">
      <h2 className="font-display text-3xl mb-8">Billing</h2>

      <div className="grid md:grid-cols-3 gap-px bg-border border border-border mb-10">
        <Stat label="assinaturas ativas" value={String(mrr)} />
        <Stat label="faturas totais" value={String(invoices.length)} />
        <Stat label="recebido (pago)" value={formatMoney(totalPaid)} />
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
        provedor: noop · pronto para Stripe / PIX
      </p>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">data</th>
              <th className="text-left p-4">usuário</th>
              <th className="text-left p-4">valor</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">provedor</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-border/50">
                <td className="p-4">{new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-4 font-mono text-[10px] truncate max-w-[200px]">{i.user_id}</td>
                <td className="p-4 font-mono">{formatMoney(i.amount_cents, i.currency)}</td>
                <td className="p-4 capitalize">{i.status}</td>
                <td className="p-4 font-mono text-xs uppercase">{i.provider}</td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground text-sm">Sem faturas — sistema preparado, aguardando provedor.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="font-display text-4xl mt-2">{value}</p>
    </div>
  );
}
