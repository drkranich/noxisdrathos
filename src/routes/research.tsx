import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Pesquisa — Observatório" },
      { name: "description", content: "Linhas de pesquisa ativas: IA, ativos digitais, automação, descentralização." },
      { property: "og:title", content: "Pesquisa — Observatório" },
      { property: "og:description", content: "Linhas de pesquisa ativas: IA, ativos digitais, automação, descentralização." },
    ],
  }),
  component: ResearchPage,
});

const TRACKS = [
  ["TR-01", "Inteligência Artificial", "Modelos, agentes, automação cognitiva e arquiteturas privadas de IA."],
  ["TR-02", "Ativos Digitais", "Tokens, ETFs, infraestrutura on-chain, custódia e regulação."],
  ["TR-03", "Economia Descentralizada", "DeFi, mercados peer-to-peer, redes monetárias paralelas."],
  ["TR-04", "Automação Pessoal", "Sistemas operacionais individuais, alavancagem por software."],
  ["TR-05", "Soberania Digital", "Privacidade, identidade própria, autocustódia, anti-fragilidade."],
  ["TR-06", "Sinais Macro", "Liquidez global, ciclos, mudanças geopolíticas relevantes."],
];

function ResearchPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="pesquisa · linhas ativas"
        title="Seis vetores. Um observatório contínuo."
        lead="Cada linha é mantida com leituras semanais, documentos internos e briefings curados."
      />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24">
        <div className="grid gap-px bg-border border border-border md:grid-cols-2">
          {TRACKS.map(([code, name, desc]) => (
            <Link
              key={code}
              to="/explore"
              className="bg-background p-10 group hover:bg-card transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                {code}
              </p>
              <h3 className="font-display text-2xl mt-4 group-hover:text-[var(--neon)] transition-colors">{name}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">{desc}</p>
              <span className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground">
                ver leituras públicas →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
