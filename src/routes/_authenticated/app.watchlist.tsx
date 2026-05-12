import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="pessoal · watchlist" title="Para acompanhar." description="O que você marcou para retornar depois." />,
});
