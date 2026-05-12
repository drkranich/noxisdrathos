import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="círculo · agenda" title="Agenda." description="Próximas sessões ao vivo, lançamentos e janelas de discussão." />,
});
