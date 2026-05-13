import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — Observatório" },
      { name: "description", content: "Um manifesto sobre IA, economia descentralizada e soberania digital." },
      { property: "og:title", content: "Manifesto — Observatório" },
      { property: "og:description", content: "Um manifesto sobre IA, economia descentralizada e soberania digital." },
    ],
  }),
  component: ManifestoPage,
});

const THESES = [
  ["I", "A nova economia é silenciosa.", "Ela não acontece em manchetes — acontece em redes, contratos e modelos."],
  ["II", "A inteligência precede o capital.", "Quem entende antes, posiciona antes. O resto recebe a notícia."],
  ["III", "Automação é alavanca, não ameaça.", "Sistemas pessoais multiplicam tempo e atenção quando bem desenhados."],
  ["IV", "Ativos digitais são linguagem.", "Tokens, dados e modelos são as novas formas de propriedade."],
  ["V", "Sobrevivência exige antecipação.", "O futuro não chega de uma vez — chega em sinais distribuídos."],
  ["VI", "O círculo é deliberado.", "Acesso restrito é uma escolha editorial, não uma estratégia de vendas."],
];

function ManifestoPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="documento · 001"
        title="Sinais sobre o que está sendo construído enquanto ninguém olha."
        lead="Este observatório existe para registrar os movimentos invisíveis da nova economia — antes que se tornem consenso."
      />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24">
        <div className="grid gap-px bg-border border border-border">
          {THESES.map(([n, title, body]) => (
            <article key={n} className="bg-background p-8 md:p-12 grid md:grid-cols-[120px_1fr] gap-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                tese · {n}
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
                <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">{body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-6">
          <Link to="/explore" className="font-mono text-[11px] uppercase tracking-[0.3em] border-b border-foreground pb-1">
            explorar a biblioteca →
          </Link>
          <Link to="/signup" className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
            solicitar acesso ao círculo
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
