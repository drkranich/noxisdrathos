import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setMemberAdminRole } from "@/lib/admin-auth.functions";
import { Input } from "@/components/ui/input";
import { Search, Shield, ShieldOff, Pause, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/members")({
  head: () => ({ meta: [{ title: "CMS — Membros" }, { name: "robots", content: "noindex" }] }),
  component: AdminMembers,
});

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
  suspended_at: string | null;
};

type Row = Profile & {
  isAdmin: boolean;
  hasMembership: boolean;
  plan: string | null;
};

function AdminMembers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const callSetAdminRole = useServerFn(setMemberAdminRole);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("id,display_name,bio,created_at,suspended_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("memberships").select("user_id,plan,status"),
    ]);
    const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const memMap = new Map((memberships ?? []).map((m) => [m.user_id, m]));
    const merged: Row[] = (profiles ?? []).map((p) => {
      const m = memMap.get(p.id);
      return {
        ...(p as Profile),
        isAdmin: adminSet.has(p.id),
        hasMembership: !!m && (m.status === "active" || m.status === "trialing"),
        plan: m?.plan ?? null,
      };
    });
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAdmin(r: Row) {
    setErr(null);
    try {
      await callSetAdminRole({ data: { targetUserId: r.id, grant: !r.isAdmin } });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao alterar papel.");
    }
  }

  async function toggleSuspend(r: Row) {
    setErr(null);
    const patch = { suspended_at: r.suspended_at ? null : new Date().toISOString() };
    const { error } = await supabase.from("profiles").update(patch).eq("id", r.id);
    if (error) return setErr(error.message);
    load();
  }

  const filtered = rows.filter((r) =>
    (r.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || r.id.includes(q)
  );

  return (
    <div className="px-8 lg:px-14 py-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-display text-2xl mr-auto">Membros</h2>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {rows.length} perfis · {rows.filter((r) => r.isAdmin).length} admins · {rows.filter((r) => r.suspended_at).length} suspensos
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar por nome ou id…" className="pl-9 bg-card border-border" />
      </div>

      {err ? <p className="font-mono text-[11px] text-destructive mb-4">{err}</p> : null}

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">membro</th>
              <th className="text-left p-4">papel</th>
              <th className="text-left p-4">plano</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">desde</th>
              <th className="p-4 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-card/30">
                <td className="p-4">
                  <div className="font-medium">{r.display_name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate max-w-xs">{r.id}</div>
                </td>
                <td className="p-4">
                  <span className={"font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 " + (r.isAdmin ? "bg-[var(--neon)]/20 text-[var(--neon)]" : "bg-muted text-muted-foreground")}>
                    {r.isAdmin ? "admin" : "membro"}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs uppercase">{r.plan ?? "free"}</td>
                <td className="p-4">
                  {r.suspended_at ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 bg-destructive/15 text-destructive">suspenso</span>
                  ) : r.hasMembership ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 bg-[var(--neon)]/15 text-[var(--neon)]">ativo</span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">inativo</span>
                  )}
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => toggleAdmin(r)} title={r.isAdmin ? "remover admin" : "tornar admin"} className="p-2 text-muted-foreground hover:text-foreground">
                      {r.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggleSuspend(r)} title={r.suspended_at ? "reativar" : "suspender"} className="p-2 text-muted-foreground hover:text-destructive">
                      {r.suspended_at ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">Nenhum membro encontrado.</td></tr>
            ) : null}
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">Carregando…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
