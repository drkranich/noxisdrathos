import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/admin/content/")({
  head: () => ({ meta: [{ title: "CMS — Conteúdos" }, { name: "robots", content: "noindex" }] }),
  component: AdminContentList,
});

type Row = {
  id: string;
  title: string;
  type: string;
  status: string;
  visibility: string;
  is_featured: boolean;
  publish_at: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  published: "bg-[var(--neon)]/20 text-[var(--neon)]",
  scheduled: "bg-amber-500/15 text-amber-300",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-destructive/15 text-destructive",
};

function AdminContentList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("content")
      .select("id,title,type,status,visibility,is_featured,publish_at,created_at")
      .order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status as "draft");
    const { data } = await query;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [status]);

  async function remove(id: string) {
    if (!confirm("Remover este conteúdo? A ação é definitiva.")) return;
    const { error } = await supabase.from("content").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  const filtered = rows.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-8 lg:px-14 py-12">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h2 className="font-display text-2xl mr-auto">Conteúdos</h2>
        <Link
          to="/app/admin/categories"
          className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          gerenciar categorias →
        </Link>
        <button
          onClick={() => nav({ to: "/app/admin/content/new" })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em]"
        >
          <Plus className="w-3.5 h-3.5" /> novo conteúdo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar por título…"
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex border border-border">
          {["all", "draft", "scheduled", "published", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] " +
                (status === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {s === "all" ? "todos" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card/50">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">título</th>
              <th className="text-left p-4">tipo</th>
              <th className="text-left p-4">status</th>
              <th className="text-left p-4">visibilidade</th>
              <th className="text-left p-4">agenda</th>
              <th className="p-4 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-card/30">
                <td className="p-4">
                  <Link
                    to="/app/admin/content/edit/$id"
                    params={{ id: r.id }}
                    className="hover:text-[var(--neon)]"
                  >
                    {r.title}
                  </Link>
                  {r.is_featured ? <span className="ml-2 neon-dot inline-block" title="destaque" /> : null}
                </td>
                <td className="p-4 font-mono text-xs uppercase">{r.type}</td>
                <td className="p-4">
                  <span className={"font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 " + (STATUS_TONE[r.status] ?? "")}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs uppercase">{r.visibility}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground">
                  {r.publish_at ? new Date(r.publish_at).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      to="/app/admin/content/edit/$id"
                      params={{ id: r.id }}
                      className="p-2 text-muted-foreground hover:text-foreground"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">Nenhum conteúdo encontrado.</td></tr>
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
