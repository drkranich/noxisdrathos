import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/videos")({
  head: () => ({ meta: [{ title: "Vídeos — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="formato · vídeo" title="Vídeos." description="Sessões gravadas, estudos e análises. Streaming privado." />,
});
