import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/admin/collections")({
  head: () => ({ meta: [{ title: "Coleções — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CollectionsPage,
});

type Collection = { id: string; slug: string; title: string; description: string | null; status: string; visibility: string; required_plan_id: string; is_featured: boolean; sort_order: number };
const PLANS = ["free", "circle", "vault", "council", "premium", "vip", "beta"];
const VIS = ["public", "members", "premium"];
function slugify(v: string) { return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function CollectionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Collection[]>([]);
  const [active, setActive] = useState<Collection | null>(null);
  async function load() { const { data } = await supabase.from("collections").select("id,slug,title,description,status,visibility,required_plan_id,is_featured,sort_order").order("sort_order"); setRows((data ?? []) as Collection[]); }
  useEffect(() => { load(); const ch = supabase.channel("admin-collections").on("postgres_changes", { event: "*", schema: "public", table: "collections" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  function createDraft() { setActive({ id: "new", slug: "", title: "", description: "", status: "draft", visibility: "members", required_plan_id: "free", is_featured: false, sort_order: rows.length + 1 }); }
  async function save() { if (!active || !user?.id || !active.title.trim()) return; const payload = { slug: active.slug || slugify(active.title), title: active.title.trim(), description: active.description || null, status: active.status as "draft", visibility: active.visibility as "members", required_plan_id: active.required_plan_id, is_featured: active.is_featured, sort_order: active.sort_order, created_by: user.id }; const q = active.id === "new" ? supabase.from("collections").insert(payload) : supabase.from("collections").update(payload).eq("id", active.id); const { error } = await q; if (error) toast.error(error.message); else { toast.success("Coleção salva"); setActive(null); load(); } }
  async function remove(id: string) { if (!confirm("Remover coleção?")) return; const { error } = await supabase.from("collections").delete().eq("id", id); if (error) toast.error(error.message); else load(); }
  return <div className="px-8 lg:px-14 py-12 grid lg:grid-cols-[1fr_420px] gap-8"><section><div className="flex items-center gap-4 mb-6"><div className="mr-auto"><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">curadoria · coleções</p><h2 className="font-display text-3xl mt-2">Coleções</h2></div><button onClick={createDraft} className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em]"><Plus className="w-4 h-4" /> nova</button></div><div className="border border-border">{rows.map((c) => <div key={c.id} className="border-b border-border/60 p-4 flex items-center gap-4"><button onClick={() => setActive(c)} className="text-left mr-auto"><div>{c.title}</div><div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{c.status} · {c.visibility} · {c.required_plan_id}</div></button><button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button></div>)}</div></section><aside className="border border-border bg-card/30 p-5 h-max space-y-4">{active ? <><Input value={active.title} onChange={(e) => setActive({ ...active, title: e.target.value, slug: active.slug || slugify(e.target.value) })} placeholder="Título" /><Input value={active.slug} onChange={(e) => setActive({ ...active, slug: slugify(e.target.value) })} placeholder="slug" /><Textarea value={active.description ?? ""} onChange={(e) => setActive({ ...active, description: e.target.value })} placeholder="Descrição" /><Select value={active.status} onValueChange={(v) => setActive({ ...active, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft", "scheduled", "published", "archived"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={active.visibility} onValueChange={(v) => setActive({ ...active, visibility: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VIS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={active.required_plan_id} onValueChange={(v) => setActive({ ...active, required_plan_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLANS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input value={String(active.sort_order)} onChange={(e) => setActive({ ...active, sort_order: Number(e.target.value) || 0 })} /><div className="flex items-center justify-between"><span className="text-sm">destaque</span><Switch checked={active.is_featured} onCheckedChange={(v) => setActive({ ...active, is_featured: v })} /></div><button onClick={save} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em]"><Save className="w-4 h-4" /> salvar coleção</button></> : <p className="text-sm text-muted-foreground">Selecione ou crie uma coleção.</p>}</aside></div>;
}
