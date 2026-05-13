import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { PLANS } from "@/lib/billing/plans";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Acesso — Observatório" },
      { name: "description", content: "Planos de acesso ao observatório privado." },
      { property: "og:title", content: "Acesso — Observatório" },
      { property: "og:description", content: "Planos de acesso ao observatório privado." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="acesso · planos"
        title="Entrar no círculo é uma decisão editorial."
        lead="Sem promoções. Sem urgência fabricada. Acesso integral à biblioteca privada, vídeos, PDFs e briefings."
      />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-32">
        <div className="grid gap-px bg-border border border-border md:grid-cols-3">
          {PLANS.map((p) => (
            <article key={p.id} className={"bg-background p-10 flex flex-col " + (p.featured ? "relative" : "")}>
              {p.featured ? (
                <div className="absolute -top-px left-0 right-0 h-px bg-[var(--neon)]" />
              ) : null}
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{p.tag}</p>
              <h2 className="font-display text-3xl mt-4">{p.name}</h2>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl">{p.price}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{p.period}</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              <ul className="mt-8 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-[var(--neon)] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={
                  "mt-10 inline-flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.3em] py-4 border " +
                  (p.featured
                    ? "border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground"
                    : "border-border hover:border-foreground")
                }
              >
                {p.cta} →
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-10 max-w-2xl font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          pagamento processado em ambiente seguro · cartão internacional · pix em breve · 30 dias de janela silenciosa para cancelamento
        </p>
      </section>
    </PublicShell>
  );
}
