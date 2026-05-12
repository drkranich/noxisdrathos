import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/community")({
  head: () => ({ meta: [{ title: "Comunidade — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="círculo · comunidade" title="Comunidade." description="Conversas privadas entre membros. Moderação silenciosa." />,
});
