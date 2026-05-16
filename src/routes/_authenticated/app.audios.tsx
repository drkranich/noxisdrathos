import { createFileRoute } from "@tanstack/react-router";
import { CinematicHero } from "@/components/CinematicHero";
import { ContentGrid, useContent } from "@/components/ContentGrid";

export const Route = createFileRoute("/_authenticated/app/audios")({
  head: () => ({ meta: [{ title: "Áudios — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: AudiosPage,
});

function AudiosPage() {
  const { items } = useContent({ types: ["audio"], limit: 60 });
  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="formato · áudio"
        title="Áudios."
        lead="Conversas longas, leituras em voz e transmissões discretas. Escute quando o silêncio chamar."
        height="sm"
      />
      <div className="px-8 lg:px-14 pt-10">
        <ContentGrid
          items={items}
          emptyEyebrow="áudios · vazio"
          emptyTitle="Sem transmissões em voz por enquanto."
          emptyDescription="Os primeiros áudios privados serão publicados em breve."
          emptyIcon="wave"
        />
      </div>
    </div>
  );
}
