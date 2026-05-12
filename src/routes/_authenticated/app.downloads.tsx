import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/downloads")({
  head: () => ({ meta: [{ title: "Downloads — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="pessoal · downloads" title="Downloads." description="Arquivos baixados ficam disponíveis offline aqui." />,
});
