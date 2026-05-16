import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PLANS, type Plan } from "@/lib/billing/plans";
import { Check, ExternalLink, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "Assinatura — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionPage,
});

type SubscriptionRow = {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

function SubscriptionPage() {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openCheckout, checkoutElement, closeCheckout, isOpen } = useStripeCheckout();

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const env = getStripeEnvironment();
      const { data } = await supabase
        .from("subscriptions")
        .select("id,status,price_id,current_period_end,cancel_at_period_end,environment")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setSub((data as SubscriptionRow | null) ?? null);
        setLoading(false);
      }
    })();

    // Realtime sync when the webhook upserts new state.
    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        async () => {
          const env = getStripeEnvironment();
          const { data } = await supabase
            .from("subscriptions")
            .select("id,status,price_id,current_period_end,cancel_at_period_end,environment")
            .eq("user_id", user.id)
            .eq("environment", env)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (active) setSub((data as SubscriptionRow | null) ?? null);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  function startCheckout(plan: Plan) {
    if (!user || !plan.stripePriceId) return;
    setError(null);
    openCheckout({
      priceId: plan.stripePriceId,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  }

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const url = await createPortalSession({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/app/subscription`,
        },
      });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível abrir o portal de cobrança.");
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = sub ? PLANS.find((p) => p.stripePriceId === sub.price_id) : null;
  const isActive = sub && ["active", "trialing", "past_due"].includes(sub.status);

  if (isOpen) {
    return (
      <div className="px-6 lg:px-14 py-10 max-w-3xl mx-auto">
        <PaymentTestModeBanner />
        <button
          onClick={closeCheckout}
          className="mt-6 mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          ← voltar
        </button>
        {checkoutElement}
      </div>
    );
  }

  return (
    <div>
      <PaymentTestModeBanner />
      <div className="px-8 lg:px-14 py-12 max-w-6xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">conta · assinatura</p>
        <h1 className="font-display text-4xl mt-3">Sua assinatura.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Gerencie seu plano, métodos de pagamento e histórico de faturas com segurança.
        </p>

        <section className="mt-10 border border-border p-8 grid md:grid-cols-3 gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">plano atual</p>
            <p className="font-display text-3xl mt-2">{currentPlan?.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">status</p>
            <p className="font-display text-3xl mt-2 capitalize">
              {loading ? "…" : sub?.status ?? "inativo"}
            </p>
            {sub?.cancel_at_period_end ? (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-500">
                cancelamento agendado
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">próxima renovação</p>
            <p className="font-display text-xl mt-2">
              {sub?.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
        </section>

        {isActive ? (
          <div className="mt-6">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="px-5 py-3 border border-border font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-accent disabled:opacity-50"
            >
              {portalLoading ? "abrindo…" : "gerenciar cobrança"}
            </button>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              portal seguro · abre em nova aba
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 font-mono text-[11px] text-amber-500">{error}</p>
        ) : null}

        <h2 className="font-display text-2xl mt-16 mb-6">
          <Sparkles className="inline w-5 h-5 mr-2 text-[var(--neon)]" />
          {isActive ? "Mudar de plano" : "Planos disponíveis"}
        </h2>
        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {PLANS.map((p) => {
            const isCurrent = isActive && currentPlan?.id === p.id;
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
                  disabled={isCurrent || !p.stripePriceId}
                  onClick={() => startCheckout(p)}
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

        <div className="mt-12 flex items-center gap-6">
          <Link to="/pricing" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground/40 pb-1 inline-flex items-center gap-2">
            ver detalhes públicos dos planos <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
