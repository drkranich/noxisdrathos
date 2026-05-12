import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";

export const Route = createFileRoute("/_authenticated/app/library")({
  head: () => ({ meta: [{ title: "Biblioteca — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PageShell
      eyebrow="biblioteca · arquivo privado"
      title="A biblioteca."
      description="Tudo que foi publicado fica aqui. Sem expiração, sem ruído. O acervo cresce a cada edição."
    />
  ),
});
