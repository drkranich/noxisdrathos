import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/favorites")({
  head: () => ({ meta: [{ title: "Favoritos — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="pessoal · favoritos" title="Favoritos." description="Os sinais que você quer guardar." />,
});
