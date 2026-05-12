import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard/PageShell";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const { user } = useAuth();
  return (
    <PageShell eyebrow="conta · configurações" title="Configurações." description="Sua identidade silenciosa dentro do observatório.">
      <div className="border border-border p-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">email</span><span className="font-mono text-xs">{user?.email}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">id</span><span className="font-mono text-[10px]">{user?.id}</span></div>
      </div>
    </PageShell>
  );
}
