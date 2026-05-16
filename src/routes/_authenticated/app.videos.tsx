import { createFileRoute } from "@tanstack/react-router";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, useContent } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/videos")({
  head: () => ({ meta: [{ title: "Vídeos — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: VideosPage,
});

function VideosPage() {
  const { items } = useContent({ types: ["video"], limit: 60 });
  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="formato · vídeo"
        title="Vídeos."
        lead="Sessões gravadas, estudos e análises. Streaming privado, sem distrações."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="vídeos · vazio"
          emptyTitle="Nenhuma transmissão arquivada."
          emptyDescription="As primeiras sessões aparecerão aqui após a publicação pelo curador."
          emptyIcon="signal"
        />
      </div>
    </div>
  );
}
