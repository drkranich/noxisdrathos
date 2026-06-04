import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";
// PaymentTestModeBanner intentionally not shown to members; admin diagnostics only.
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

type MembershipRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at: string | null;
  stripe_subscription_id: string | null;
};

function SubscriptionPage() {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  // checkout via redirect — sem embedded

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const env = getStripeEnvironment();
      const [{ data: subData }, { data: memData }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id,status,price_id,current_period_end,cancel_at_period_end,environment")
          .eq("user_id", user.id)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("memberships")
          .select("plan,status,current_period_end,cancel_at,stripe_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (active) {
        setSub((subData as SubscriptionRow | null) ?? null);
        setMembership((memData as MembershipRow | null) ?? null);
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
          const [{ data: subData }, { data: memData }] = await Promise.all([
            supabase
              .from("subscriptions")
              .select("id,status,price_id,current_period_end,cancel_at_period_end,environment")
              .eq("user_id", user.id)
              .eq("environment", env)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("memberships")
              .select("plan,status,current_period_end,cancel_at,stripe_subscription_id")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          if (active) {
            setSub((subData as SubscriptionRow | null) ?? null);
            setMembership((memData as MembershipRow | null) ?? null);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function startCheckout(plan: Plan) {
    if (!user || !plan.stripePriceId) return;
    setError(null);
    setCheckoutLoading(plan.id);
    try {
      const { createCheckoutSession } = await import("@/utils/payments.functions");
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const url = await createCheckoutSession({
        data: {
          priceId: plan.stripePriceId,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (url) window.location.href = url as string;
      else setError("Não foi possível iniciar o checkout.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar checkout.");
    } finally {
      setCheckoutLoading(null);
    }
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

  // Usa memberships como fonte primária (atualizada pelo webhook), subscriptions como fallback
  const activeMembership = membership && ["active","trialing","past_due"].includes(membership.status) ? membership : null;
  const currentPlan = activeMembership
    ? PLANS.find((p) => p.id === activeMembership.plan)
    : sub ? PLANS.find((p) => p.stripePriceId === sub.price_id) : null;
  const isActive = !!(activeMembership || (sub && ["active","trialing","past_due"].includes(sub.status)));
  // Dados de exibição: preferir membership (mais recente via webhook)
  const displayStatus = activeMembership?.status ?? sub?.status ?? null;
  const displayPeriodEnd = activeMembership?.current_period_end ?? sub?.current_period_end ?? null;
  const displayCancelScheduled = activeMembership?.cancel_at
    ? new Date(activeMembership.cancel_at) > new Date()
    : sub?.cancel_at_period_end ?? false;



  return (
    <div>
      {/* test-mode banner suppressed for members */}
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
              {loading ? "…" : displayStatus ?? "inativo"}
            </p>
            {displayCancelScheduled ? (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-500">
                cancelamento agendado
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">próxima renovação</p>
            <p className="font-display text-xl mt-2">
              {displayPeriodEnd
                ? new Date(displayPeriodEnd).toLocaleDateString("pt-BR")
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
        <div className="grid md:grid-cols-3 gap-4 mt-2">
          {PLANS.map((p) => {
            const isCurrent = isActive && currentPlan?.id === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: p.featured
                    ? "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)"
                    : "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: p.featured
                    ? "1px solid rgba(var(--neon-rgb,100,220,100),0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: p.featured
                    ? "0 0 40px rgba(var(--neon-rgb,100,220,100),0.08), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
                className={"relative rounded-xl p-8 flex flex-col " + (isCurrent ? "ring-2 ring-[var(--neon)]/60" : "")}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.25em]"
                    style={{background:"rgba(var(--neon-rgb,100,220,100),0.15)", border:"1px solid rgba(var(--neon-rgb,100,220,100),0.4)", color:"var(--neon,#64dc64)"}}>
                    recomendado
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.25em] bg-[var(--neon)]/20 border border-[var(--neon)]/40 text-[var(--neon)]">
                    ativo
                  </div>
                )}
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{p.tag}</p>
                <h3 className="font-display text-3xl mt-3">{p.name}</h3>
                <p className="mt-4 font-display text-4xl">
                  {p.price}<span className="text-muted-foreground text-base ml-1">{p.period}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--neon)]" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent || !p.stripePriceId || checkoutLoading !== null}
                  onClick={() => startCheckout(p)}
                  className="mt-8 w-full px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.25em] transition rounded-lg"
                  style={isCurrent
                    ? {background:"rgba(255,255,255,0.06)", color:"var(--muted-foreground)", cursor:"default"}
                    : p.featured
                    ? {background:"rgba(var(--neon-rgb,100,220,100),0.15)", border:"1px solid rgba(var(--neon-rgb,100,220,100),0.4)", color:"var(--neon,#64dc64)"}
                    : {background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"var(--foreground)"}
                  }
                >
                  {isCurrent ? "plano atual" : checkoutLoading === p.id ? "aguarde…" : p.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex items-center gap-6">
          <Link to="/pricing" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground/40 pb-1 inline-flex items-center gap-2">
            
          </Link>
        </div>
      </div>
    </div>
  );
}
