import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Observatório" },
      { name: "description", content: "Perguntas frequentes sobre o observatório privado." },
      { property: "og:title", content: "FAQ — Observatório" },
      { property: "og:description", content: "Perguntas frequentes sobre o observatório privado." },
    ],
  }),
  component: FaqPage,
});

const QA = [
  ["O que é o Observatório?", "Um laboratório editorial privado sobre IA, economia descentralizada, automação e ativos digitais. Funciona como um clube de leitura e pesquisa contínua."],
  ["Como funciona o acesso?", "Cada novo membro recebe acesso integral à biblioteca, vídeos e briefings privados, além de participação na comunidade discreta de membros."],
  ["É um curso?", "Não. É uma operação editorial contínua. Não há aulas ou módulos sequenciais — há um corpo vivo de pesquisa que cresce a cada edição."],
  ["Há reembolso?", "Sim. Trinta dias de janela silenciosa para cancelamento integral, sem perguntas."],
  ["Quem está por trás?", "Um time pequeno e propositalmente discreto de pesquisadores, operadores e curadores. A escolha pelo silêncio é editorial."],
  ["Como meus dados são tratados?", "Tudo é armazenado em infraestrutura própria, com criptografia em repouso e em trânsito. Nada é vendido. Nada é compartilhado."],
];

function FaqPage() {
  return (
    <PublicShell>
      <PageHeader eyebrow="perguntas" title="O que precisa ser perguntado antes de entrar." />
      <section className="mx-auto max-w-3xl px-6 md:px-10 pb-32">
        <Accordion type="single" collapsible className="border-t border-border">
          {QA.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-b border-border">
              <AccordionTrigger className="py-6 text-left font-display text-xl hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </PublicShell>
  );
}
