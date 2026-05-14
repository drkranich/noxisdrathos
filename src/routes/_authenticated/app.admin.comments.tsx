import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/comments")({
  head: () => ({ meta: [{ title: "CMS — Moderação" }, { name: "robots", content: "noindex" }] }),
  component: AdminComments,
});

type Row = {
  id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  user_id: string;
  content_id: string;
  author?: string | null;
  contentTitle?: string | null;
};

function AdminComments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase.from("comments").select("id,body,is_hidden,created_at,user_id,content_id").order("created_at", { ascending: false }).limit(200);
    if (filter === "visible") q = q.eq("is_hidden", false);
    if (filter === "hidden") q = q.eq("is_hidden", true);
    const { data: comments } = await q;
    const list = (comments ?? []) as Row[];
    const userIds = [...new Set(list.map((c) => c.user_id))];
    const contentIds = [...new Set(list.map((c) => c.content_id))];
    const [{ data: profiles }, { data: contents }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id,display_name").in("id", userIds) : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
      contentIds.length ? supabase.from("content").select("id,title").in("id", contentIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    const cMap = new Map((contents ?? []).map((c) => [c.id, c.title]));
    setRows(list.map((r) => ({ ...r, author: pMap.get(r.user_id) ?? null, contentTitle: cMap.get(r.content_id) ?? null })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleHidden(r: Row) {
    await supabase.from("comments").update({ is_hidden: !r.is_hidden }).eq("id", r.id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir comentário?")) return;
    await supabase.from("comments").delete().eq("id", id);
    load();
  }

  return (
    <div className="px-8 lg:px-14 py-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-display text-2xl mr-auto">Moderação</h2>
        <div className="flex border border-border">
          {(["all","visible","hidden"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={"px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] " + (filter === f ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f === "all" ? "todos" : f === "visible" ? "visíveis" : "ocultos"}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="p-5 flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {r.author ?? "anônimo"} · {new Date(r.created_at).toLocaleString("pt-BR")}
                </span>
                {r.is_hidden ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 bg-destructive/15 text-destructive">oculto</span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.body}</p>
              {r.contentTitle ? (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">em: {r.contentTitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleHidden(r)} className="p-2 text-muted-foreground hover:text-foreground" title={r.is_hidden ? "restaurar" : "ocultar"}>
                {r.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => remove(r.id)} className="p-2 text-muted-foreground hover:text-destructive" title="excluir">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhum comentário.</div>
        ) : null}
        {loading ? <div className="p-12 text-center text-muted-foreground text-sm">Carregando…</div> : null}
      </div>
    </div>
  );
}
