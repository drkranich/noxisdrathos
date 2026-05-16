import { createFileRoute } from "@tanstack/react-router";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, useContent } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/pdfs")({
  head: () => ({ meta: [{ title: "Relatórios — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: PdfsPage,
});

function PdfsPage() {
  const { items } = useContent({ types: ["pdf"], limit: 60 });
  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="formato · documento"
        title="Relatórios."
        lead="Dossiês, mapas e leituras profundas. Acesso protegido, leitura sob demanda."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="dossiês · vazio"
          emptyTitle="Nenhum dossiê arquivado ainda."
          emptyDescription="Os primeiros documentos privados aparecerão aqui em breve."
          emptyIcon="archive"
        />
      </div>
    </div>
  );
}
