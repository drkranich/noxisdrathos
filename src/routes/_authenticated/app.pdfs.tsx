import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/pdfs")({
  head: () => ({ meta: [{ title: "PDFs — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="formato · documento" title="PDFs." description="Relatórios, dossiês e leituras restritas em formato editorial." />,
});
