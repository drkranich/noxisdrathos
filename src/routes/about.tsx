import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre — Observatório" },
      { name: "description", content: "Um laboratório privado de inteligência sobre a nova economia." },
      { property: "og:title", content: "Sobre — Observatório" },
      { property: "og:description", content: "Um laboratório privado de inteligência sobre a nova economia." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="instituto"
        title="Um laboratório privado para quem antecipa o futuro."
        lead="Não somos um curso. Não somos uma newsletter. Somos um observatório editorial — uma operação contínua de leitura de sinais."
      />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 grid gap-16 md:grid-cols-2">
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Operamos em silêncio. Cada edição reúne pesquisas internas, leituras estratégicas e
            material de referência sobre IA, ativos digitais, automação pessoal e arquiteturas
            descentralizadas.
          </p>
          <p>
            O acesso é deliberadamente limitado. Membros recebem documentos, vídeos e briefings
            privados — e participam de uma comunidade discreta de operadores, fundadores e
            pesquisadores.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border border border-border">
          {[
            ["014", "edições"],
            ["+200", "documentos"],
            ["38", "países"],
            ["100%", "privado"],
          ].map(([n, l]) => (
            <div key={l} className="bg-background p-8">
              <div className="font-display text-4xl">{n}</div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
