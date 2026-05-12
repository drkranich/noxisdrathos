import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
export const Route = createFileRoute("/_authenticated/app/admin/members")({
  component: () => (
    <PageShell eyebrow="admin · membros" title="Membros." description="Lista de membros, status, suspensões e papéis. Em ativação." />
  ),
});
