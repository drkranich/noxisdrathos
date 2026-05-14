import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/announcements")({
  head: () => ({ meta: [{ title: "CMS — Anúncios" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnnouncements,
});

type A = {
  id: string;
  title: string;
  body: string | null;
  level: string;
  audience: string;
  is_active: boolean;
  publish_at: string;
  expires_at: string | null;
};

function AdminAnnouncements() {
  const { user } = useAuth();
  const [rows, setRows] = useState<A[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [audience, setAudience] = useState("members");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("publish_at", { ascending: false });
    setRows((data ?? []) as A[]);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(null);
    if (!title.trim() || !user) return;
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), body: body.trim() || null, level, audience, created_by: user.id,
    });
    if (error) return setErr(error.message);
    setTitle(""); setBody(""); load();
  }
  async function toggle(r: A) {
    await supabase.from("announcements").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Remover este anúncio?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  }

  return (
    <div className="px-8 lg:px-14 py-12 max-w-4xl">
      <h2 className="font-display text-3xl mb-8">Anúncios</h2>

      <div className="border border-border p-6 mb-10 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">novo anúncio</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="bg-card border-border" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Corpo (opcional)" rows={2} className="bg-card border-border resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">info</SelectItem>
              <SelectItem value="warning">warning</SelectItem>
              <SelectItem value="premium">premium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">público</SelectItem>
              <SelectItem value="members">membros</SelectItem>
              <SelectItem value="premium">premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={create}><Plus className="w-4 h-4 mr-2" /> publicar</Button>
        {err ? <p className="font-mono text-[11px] text-destructive">{err}</p> : null}
      </div>

      <ul className="border border-border divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
                {r.audience} · {r.level} · {new Date(r.publish_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
            <button onClick={() => remove(r.id)} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {rows.length === 0 ? <li className="p-12 text-center text-muted-foreground text-sm">Nenhum anúncio.</li> : null}
      </ul>
    </div>
  );
}
