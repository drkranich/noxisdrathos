import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({ meta: [{ title: "Assinatura — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <PageShell
      eyebrow="conta · assinatura"
      title="Sua assinatura."
      description="Pagamento via Stripe. PIX e cartão internacional disponíveis. O checkout integrado entrará na próxima fase."
    />
  ),
});
