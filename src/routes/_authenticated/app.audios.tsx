import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/audios")({
  head: () => ({ meta: [{ title: "Áudios — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="formato · áudio" title="Áudios." description="Conversas longas, leituras dramatizadas e boletins privados." />,
});
