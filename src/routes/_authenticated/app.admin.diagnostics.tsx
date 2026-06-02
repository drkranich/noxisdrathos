import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminDiagnostics } from "@/lib/admin-auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/admin/diagnostics")({
  head: () => ({
    meta: [{ title: "Admin — Diagnóstico" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminDiagnostics,
});

type Diagnostics = Awaited<ReturnType<typeof getAdminDiagnostics>>;

function AdminDiagnostics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
  user,
  loading,
  rolesLoading,
  roles,
  primaryRole,
  isAdmin,
  roleDiagnostics,
  refreshRoles,
} = useAuth();
  const fetchDiagnostics = useServerFn(getAdminDiagnostics);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(true);

  const redirectTarget = useMemo(() => {
    if (loading || rolesLoading) return "aguardando hidratação";
    if (!user) return "/login";
    if (!isAdmin) return "/app";
    return "nenhum";
  }, [isAdmin, loading, rolesLoading, user]);

  const loadDiagnostics = useCallback(async () => {
    setLoadingPanel(true);
    setError(null);
    try {
      const data = await fetchDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPanel(false);
    }
  }, [fetchDiagnostics]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  const d = diagnostics;
  const rows = [
    ["Current email", user?.email ?? d?.currentEmail ?? "—"],
    ["Current auth uid", user?.id ?? d?.currentAuthUid ?? "—"],
    ["Current role", primaryRole],
    [
      "SUPER_ADMIN_EMAIL env value",
      d?.superAdminEmail ?? "carregando",
    ],
    ["SUPER_ADMIN_EMAIL source", d?.superAdminEmailSource ?? "—"],
    ["Session hydrated", loading ? "não" : "sim"],
    ["Role hydrated", rolesLoading ? "não" : "sim"],
    ["Admin access result", isAdmin ? "permitido" : "negado"],
    ["Current pathname", pathname],
    ["Current redirect target", redirectTarget],
    ["Email matches SUPER_ADMIN_EMAIL", d?.emailMatchesSuperAdmin ? "sim" : "não"],
    ["Email has no spaces", d?.authEmailHasNoOuterSpaces ? "sim" : "não"],
  ];

  return (
    <div className="px-8 py-10 lg:px-14">
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            admin · autorização
          </p>
          <h2 className="mt-3 font-display text-3xl">Diagnóstico de role pipeline</h2>
        </div>
        <Button
          onClick={() => {
            refreshRoles();
            loadDiagnostics();
          }}
          disabled={loadingPanel}
          variant="outline"
        >
          {loadingPanel ? "verificando…" : "reverificar"}
        </Button>
      </div>

      {error ? <p className="mb-6 font-mono text-xs text-destructive">{error}</p> : null}

      <div className="grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-background p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 break-words font-mono text-xs text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <DiagnosticBlock
          title="Current profile row"
          value={d?.profileRow}
          error={d?.profileError}
        />
        <DiagnosticBlock
          title="Current user_roles row"
          value={d?.userRolesRows ?? roles}
          error={d?.userRolesError}
        />
<DiagnosticBlock title="Role query response" value={d?.roleQueryResponse} />
<DiagnosticBlock title="Frontend role pipeline" value={roleDiagnostics} />
      </div>
    </div>
  );
}

function DiagnosticBlock({
  title,
  value,
  error,
}: {
  title: string;
  value: unknown;
  error?: string | null;
}) {
  return (
    <section className="border border-border bg-card/30 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className={error ? "h-2 w-2 rounded-full bg-destructive" : "neon-dot"} />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {error ? <p className="mb-3 font-mono text-xs text-destructive">{error}</p> : null}
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-background/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {JSON.stringify(value ?? null, null, 2)}
      </pre>
    </section>
  );
}
