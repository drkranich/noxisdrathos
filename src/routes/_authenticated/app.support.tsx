import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/support")({
  head: () => ({ meta: [{ title: "Suporte — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => <PageShell eyebrow="conta · suporte" title="Suporte." description="Toda comunicação é privada e tratada por humanos. Resposta em até 48h." />,
});
