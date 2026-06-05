import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckSquare, Copy, Eye, FileAudio, FilePlus2, FileText, Film, Layers, Pencil, Plus, Search, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { getSignedUrl } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { PublishingStudio } from "@/components/admin/PublishingStudio";

export const Route = createFileRoute("/_authenticated/app/admin/content")({
  head: () => ({ meta: [{ title: "Content Studio — CMS" }, { name: "robots", content: "noindex" }] }),
  component: AdminContentStudio,
});

type StudioKind = "video" | "pdf" | "audio" | "article" | "report";
type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: string;
  content_kind: string | null;
  status: string;
  visibility: string;
  required_plan_id: string | null;
  created_at: string;
  category_id: string | null;
  thumbnail_url: string | null;
  thumbnail_bucket: string | null;
  categories?: { name: string | null } | null;
};

const ACTIONS: Array<{ kind: StudioKind | "collection"; label: string; icon: typeof Film }> = [
  { kind: "video", label: "New Video", icon: Film },
  { kind: "pdf", label: "New PDF", icon: FileText },
  { kind: "audio", label: "New Audio", icon: FileAudio },
  { kind: "article", label: "New Article", icon: FilePlus2 },
  { kind: "report", label: "New Report", icon: FileText },
  { kind: "collection", label: "New Collection", icon: Layers },
];

const STATUS_TONE: Record<string, string> = {
  published: "bg-neon-soft text-neon",
  scheduled: "bg-secondary text-foreground",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-destructive/15 text-destructive",
};

function AdminContentStudio() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeKind, setActiveKind] = useState<StudioKind | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("content")
      .select("id,slug,title,subtitle,type,content_kind,status,visibility,required_plan_id,created_at,category_id,thumbnail_url,thumbnail_bucket,categories(name)")
      .order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status as "draft");
    const { data, error } = await query;
    if (error) toast.error(error.message);
    const next = (data ?? []) as Row[];
    setRows(next);
    setLoading(false);
    const signed: Record<string, string> = {};
    await Promise.all(next.map(async (row) => {
      if (!row.thumbnail_url) return;
      try { signed[row.id] = await getSignedUrl(row.thumbnail_bucket || "section-thumbnails", row.thumbnail_url, 1800) ?? ""; } catch {}
    }));
    setThumbs(signed);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-content-studio").on("postgres_changes", { event: "*", schema: "public", table: "content" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [status]);

  async function remove(id: string) {
    if (!confirm("Delete this content item?")) return;
    const { error } = await supabase.from("content").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Content deleted"); load(); }
  }

  async function duplicate(row: Row) {
    const { data, error: fetchError } = await supabase.from("content").select("*").eq("id", row.id).single();
    if (fetchError || !data) { toast.error(fetchError?.message ?? "Content not found"); return; }
    const copy: TablesInsert<"content"> = {
      ...data,
      id: undefined,
      title: `${data.title} — Copy`,
      slug: `${data.slug}-${Date.now()}`,
      status: "draft",
      publish_at: null,
      created_at: undefined,
      updated_at: undefined,
      search_vector: undefined,
    };
    const { error } = await supabase.from("content").insert(copy);
    if (error) toast.error(error.message);
    else { toast.success("Content duplicated as draft"); load(); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} item(s) permanentemente?`)) return;
    setBulkLoading(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("content").delete().in("id", ids);
    if (error) toast.error(error.message);
    else {
      toast.success(`${ids.length} item(s) excluído(s).`);
      setSelected(new Set());
      load();
    }
    setBulkLoading(false);
  }

  async function bulkDuplicate() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (row) { await duplicate(row); ok++; }
    }
    toast.success(`${ok} item(s) duplicado(s) como rascunho.`);
    setSelected(new Set());
    setBulkLoading(false);
  }

  const filtered = rows.filter((r) => [r.title, r.subtitle, r.type, r.content_kind, r.categories?.name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-8 lg:px-14 py-12 space-y-8">
      <header className="space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="mr-auto">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">admin · publishing</p>
            <h1 className="font-display text-5xl mt-2">Content Studio</h1>
          </div>
          <Link to="/app/admin/media" className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground hover:bg-accent">Media Manager</Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const collection = action.kind === "collection";
            return collection ? (
              <Link key={action.kind} to="/app/admin/collections" className="group border border-border bg-card/30 p-4 text-left hover:bg-accent/70 transition">
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                <span className="block mt-5 font-mono text-[11px] uppercase tracking-[0.25em]">{action.label}</span>
              </Link>
            ) : (
              <button key={action.kind} onClick={() => setActiveKind(action.kind as StudioKind)} className="group border border-border bg-card/30 p-4 text-left hover:bg-accent/70 transition">
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                <span className="block mt-5 font-mono text-[11px] uppercase tracking-[0.25em]">+ {action.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {activeKind ? (
        <section className="border border-border bg-background/80 p-5 shadow-2xl">
          <PublishingStudio initialKind={activeKind} embedded onCancel={() => setActiveKind(null)} onSaved={() => { setActiveKind(null); load(); }} />
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl mr-auto">Content List</h2>
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…" className="pl-9 bg-card border-border" />
          </div>
          <div className="flex border border-border overflow-x-auto">
            {["all", "draft", "scheduled", "published", "archived"].map((s) => <button key={s} onClick={() => setStatus(s)} className={(status === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground") + " px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em]"}>{s}</button>)}
          </div>
        </div>
        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div
            style={{ background: "rgba(100,220,100,0.08)", border: "1px solid rgba(100,220,100,0.2)", borderRadius: 10 }}
            className="flex items-center gap-4 px-4 py-3"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{color:"var(--neon,#64dc64)"}}>
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={bulkDuplicate} disabled={bulkLoading}
                className="flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-accent transition disabled:opacity-50">
                <Copy className="w-3.5 h-3.5" /> duplicar
              </button>
              <button onClick={bulkDelete} disabled={bulkLoading}
                className="flex items-center gap-2 border border-destructive/40 text-destructive px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-destructive/10 transition disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" /> excluir
              </button>
              <button onClick={() => setSelected(new Set())}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition">
                cancelar
              </button>
            </div>
          </div>
        )}

        <div className="border border-border overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border bg-card/50">
              <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <th className="p-4 w-10">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition" title="Selecionar todos">
                    {selected.size === filtered.length && filtered.length > 0
                      ? <CheckSquare className="w-4 h-4" style={{color:"var(--neon,#64dc64)"}} />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left p-4">Thumbnail</th><th className="text-left p-4">Type</th><th className="text-left p-4">Title</th><th className="text-left p-4">Category</th><th className="text-left p-4">Visibility</th><th className="text-left p-4">Status</th><th className="text-left p-4">Created At</th><th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={"border-b border-border/50 hover:bg-card/30" + (selected.has(r.id) ? " bg-[rgba(100,220,100,0.04)]" : "")}>
                  <td className="p-4 w-10 align-middle"><button onClick={() => toggleSelect(r.id)} className="text-muted-foreground hover:text-foreground transition">{selected.has(r.id) ? <CheckSquare className="w-4 h-4" style={{color:"var(--neon,#64dc64)"}} /> : <Square className="w-4 h-4" />}</button></td>
                  <td className="p-4"><div className="h-16 w-28 border border-border bg-card overflow-hidden">{thumbs[r.id] ? <img src={thumbs[r.id]} alt={`${r.title} thumbnail`} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-muted-foreground"><Plus className="w-4 h-4" /></div>}</div></td>
                  <td className="p-4 font-mono text-xs uppercase">{r.content_kind || r.type}</td>
                  <td className="p-4"><div className="font-medium">{r.title}</div>{r.subtitle ? <div className="text-xs text-muted-foreground line-clamp-1">{r.subtitle}</div> : null}</td>
                  <td className="p-4 text-muted-foreground">{r.categories?.name ?? "—"}</td>
                  <td className="p-4 font-mono text-xs uppercase">{r.visibility} · {r.required_plan_id ?? "free"}</td>
                  <td className="p-4"><span className={(STATUS_TONE[r.status] ?? "bg-muted text-muted-foreground") + " px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"}>{r.status}</span></td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-4"><div className="flex items-center justify-end gap-1"><Link to="/app/admin/content/edit/$id" params={{ id: r.id }} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Edit"><Pencil className="w-4 h-4" /></Link><button onClick={() => duplicate(r)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Duplicate"><Copy className="w-4 h-4" /></button>{r.status === "published"
  ? <Link to="/app/content/$slug" params={{ slug: r.slug }} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Preview" target="_blank"><Eye className="w-4 h-4" /></Link>
  : <Link to="/app/admin/content/edit/$id" params={{ id: r.id }} className="p-2 text-muted-foreground hover:text-foreground opacity-50" aria-label="Preview (publicar primeiro)" title="Publicar para pré-visualizar"><Eye className="w-4 h-4" /></Link>}<button onClick={() => remove(r.id)} className="p-2 text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No content found.</td></tr> : null}
              {loading ? <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">Loading content…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}