import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/logs")({
  head: () => ({ meta: [{ title: "CMS — Logs" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogs,
});

type Log = {
  id: string; actor_id: string; action: string;
  target_table: string | null; target_id: string | null;
  created_at: string;
};

function AdminLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  useEffect(() => {
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows((data ?? []) as Log[]));
  }, []);

  return (
    <div className="px-8 lg:px-14 py-12">
      <h2 className="font-display text-3xl mb-2">Logs administrativos</h2>
      <p className="text-muted-foreground mb-8">Trilha de auditoria de ações sensíveis.</p>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">quando</th>
              <th className="text-left p-4">ator</th>
              <th className="text-left p-4">ação</th>
              <th className="text-left p-4">alvo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-4 font-mono text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-4 font-mono text-[10px] truncate max-w-[200px]">{r.actor_id}</td>
                <td className="p-4 font-mono text-xs">{r.action}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground">
                  {r.target_table ? `${r.target_table}/${r.target_id ?? "—"}` : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground text-sm">Sem registros ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
