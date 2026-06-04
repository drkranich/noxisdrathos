import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setMemberAdminRole } from "@/lib/admin-auth.functions";
import { Input } from "@/components/ui/input";
import { Search, Shield, ShieldOff, Pause, Play, MessageCircle, Phone, Mail } from "lucide-react";

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
  email?: string;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  signal_phone?: string | null;
  contact_channel?: string;
  contact_opt_in?: boolean;
};

function AdminMembers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"members"|"contacts">("members");

  const callSetAdminRole = useServerFn(setMemberAdminRole);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: memberships }] = await Promise.all([
      supabase.from("profiles_with_email").select("id,display_name,bio,created_at,suspended_at,telegram_chat_id,telegram_username,signal_phone,contact_channel,contact_opt_in,email").order("created_at", { ascending: false }),
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

      {tab === "members" && <div className="border border-border">
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
      </div>}

      {/* Aba de contatos */}
      {tab === "contacts" && (
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "com telegram", value: rows.filter(r => r.telegram_chat_id).length, icon: MessageCircle, color: "text-blue-400" },
            { label: "com signal", value: rows.filter(r => r.signal_phone).length, icon: Phone, color: "text-green-400" },
            { label: "opt-in total", value: rows.filter(r => r.contact_opt_in).length, icon: Mail, color: "text-[var(--neon)]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12}} className="p-4">
              <Icon className={`w-4 h-4 ${color} mb-2`} />
              <p className="font-display text-3xl">{value}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/40">
                <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">membro</th>
                <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">canal</th>
                <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">telegram</th>
                <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.filter(r => r.contact_opt_in || r.telegram_chat_id || r.signal_phone).length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">Nenhum membro cadastrou contato ainda.</td></tr>
              ) : rows.filter(r => r.contact_opt_in || r.telegram_chat_id || r.signal_phone).map(r => (
                <tr key={r.id} className="hover:bg-accent/30 transition">
                  <td className="p-3">
                    <p className="text-sm">{r.display_name ?? "—"}</p>
                    {r.email && <p className="font-mono text-[10px] text-muted-foreground">{r.email}</p>}
                  </td>
                  <td className="p-3">
                    <span className={`font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded ${
                      r.contact_channel === "telegram" ? "bg-blue-500/10 text-blue-400" :
                      r.contact_channel === "signal" ? "bg-green-500/10 text-green-400" :
                      r.contact_channel === "both" ? "bg-[var(--neon)]/10 text-[var(--neon)]" :
                      "text-muted-foreground"
                    }`}>
                      {r.contact_channel ?? "none"}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    {r.telegram_chat_id ? (
                      <span className="text-blue-400">✓ {r.telegram_username ? `@${r.telegram_username}` : r.telegram_chat_id}</span>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    {r.signal_phone ? (
                      <span className="text-green-400">{r.signal_phone}</span>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
