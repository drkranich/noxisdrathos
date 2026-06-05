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
  email?: string;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  signal_phone?: string | null;
  contact_channel?: string;
  contact_opt_in?: boolean;
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
  const [tab, setTab] = useState<"members" | "contacts">("members");

  const callSetAdminRole = useServerFn(setMemberAdminRole);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: memberships }] = await Promise.all([
      (supabase as any).from("profiles_with_email").select("id,display_name,bio,created_at,suspended_at,telegram_chat_id,telegram_username,signal_phone,contact_channel,contact_opt_in,email").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("memberships").select("user_id,plan,status"),
    ]);

    const merged: Row[] = ((profiles ?? []) as Profile[]).map((p) => {
      const role = (roles ?? []).find((r) => r.user_id === p.id);
      const mem = (memberships ?? []).find((m) => m.user_id === p.id);
      return {
        ...p,
        isAdmin: role?.role === "admin" || role?.role === "super_admin",
        hasMembership: !!mem,
        plan: mem?.plan ?? null,
      };
    });
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message ?? "erro"));
  }, []);

  async function toggleAdmin(r: Row) {
    try {
      await callSetAdminRole({ data: { userId: r.id, makeAdmin: !r.isAdmin } });
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "erro");
    }
  }

  async function toggleSuspend(r: Row) {
    const patch = { suspended_at: r.suspended_at ? null : new Date().toISOString() };
    await supabase.from("profiles").update(patch).eq("id", r.id);
    load();
  }

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.display_name ?? "").toLowerCase().includes(s) || (r.id ?? "").toLowerCase().includes(s);
  });

  const contactRows = rows.filter((r) => r.contact_opt_in || r.telegram_chat_id || r.signal_phone);

  return (
    <div className="px-8 lg:px-14 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl">Membros</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} perfis · {rows.filter((r) => r.isAdmin).length} admins
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(["members", "contacts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "font-mono text-[10px] uppercase tracking-[0.25em] px-4 py-2 border transition " +
              (tab === t ? "border-foreground bg-accent" : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t === "members" ? "perfis" : `contatos (${contactRows.length})`}
          </button>
        ))}
      </div>

      {err ? <p className="font-mono text-[10px] text-destructive">{err}</p> : null}

      {/* Tab: Perfis */}
      {tab === "members" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="buscar por nome ou id..."
              className="pl-9"
            />
          </div>

          <div className="border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/40">
                  <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">membro</th>
                  <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">papel</th>
                  <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">plano</th>
                  <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">status</th>
                  <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">desde</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">Carregando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">Nenhum membro encontrado.</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition">
                    <td className="p-3">
                      <p className="text-sm">{r.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">{r.email ?? r.id}</p>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${r.isAdmin ? "text-amber-400" : "text-muted-foreground"}`}>
                        {r.isAdmin ? "admin" : "membro"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.plan ?? "—"}</td>
                    <td className="p-3">
                      <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${r.suspended_at ? "text-destructive" : "text-green-500"}`}>
                        {r.suspended_at ? "suspenso" : "ativo"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => toggleAdmin(r)} title={r.isAdmin ? "remover admin" : "tornar admin"}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition">
                          {r.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                        <button onClick={() => toggleSuspend(r)} title={r.suspended_at ? "reativar" : "suspender"}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition">
                          {r.suspended_at ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab: Contatos */}
      {tab === "contacts" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "com telegram", value: rows.filter((r) => r.telegram_chat_id).length, icon: MessageCircle, color: "text-blue-400" },
              { label: "com signal", value: rows.filter((r) => r.signal_phone).length, icon: Phone, color: "text-green-400" },
              { label: "opt-in total", value: rows.filter((r) => r.contact_opt_in).length, icon: Mail, color: "text-[var(--neon)]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                className="p-4"
              >
                <Icon className={`w-4 h-4 ${color} mb-2`} />
                <p className="font-display text-3xl">{value}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabela */}
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
                {contactRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                      Nenhum membro cadastrou contato ainda.
                    </td>
                  </tr>
                ) : contactRows.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition">
                    <td className="p-3">
                      <p className="text-sm">{r.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{r.email ?? ""}</p>
                    </td>
                    <td className="p-3">
                      <span className={
                        "font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded " +
                        (r.contact_channel === "telegram" ? "bg-blue-500/10 text-blue-400" :
                        r.contact_channel === "signal" ? "bg-green-500/10 text-green-400" :
                        r.contact_channel === "both" ? "bg-[var(--neon)]/10 text-[var(--neon)]" :
                        "text-muted-foreground")
                      }>
                        {r.contact_channel ?? "none"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {r.telegram_chat_id
                        ? <span className="text-blue-400">{"✓ " + (r.telegram_username ? "@" + r.telegram_username : r.telegram_chat_id)}</span>
                        : <span className="text-muted-foreground/40">—</span>
                      }
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {r.signal_phone
                        ? <span className="text-green-400">{r.signal_phone}</span>
                        : <span className="text-muted-foreground/40">—</span>
                      }
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
