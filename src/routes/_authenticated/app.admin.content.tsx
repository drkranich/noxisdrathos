import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/content")({
  component: AdminContent,
});

type Row = {
  id: string;
  title: string;
  type: string;
  status: string;
  visibility: string;
  is_featured: boolean;
  created_at: string;
};

function AdminContent() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase
      .from("content")
      .select("id,title,type,status,visibility,is_featured,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);

  return (
    <div className="px-8 lg:px-14 py-12">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-2xl">Conteúdos</h2>
        <button className="px-4 py-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em]">
          novo conteúdo
        </button>
      </div>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">título</th>
              <th className="text-left p-4">tipo</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">visibilidade</th>
              <th className="text-left p-4">criado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-4">{r.title} {r.is_featured ? <span className="ml-2 neon-dot inline-block" /> : null}</td>
                <td className="p-4 font-mono text-xs uppercase">{r.type}</td>
                <td className="p-4 font-mono text-xs uppercase">{r.status}</td>
                <td className="p-4 font-mono text-xs uppercase">{r.visibility}</td>
                <td className="p-4 font-mono text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground text-sm">Nenhum conteúdo ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
