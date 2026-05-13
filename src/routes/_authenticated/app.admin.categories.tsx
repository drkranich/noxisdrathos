import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/categories")({
  head: () => ({ meta: [{ title: "CMS — Categorias" }, { name: "robots", content: "noindex" }] }),
  component: AdminCategories,
});

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    setRows((data ?? []) as Category[]);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setError(null);
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      slug: slugify(name),
      description: description.trim() || null,
      sort_order: rows.length,
    });
    if (error) { setError(error.message); return; }
    setName(""); setDescription(""); load();
  }

  async function update(id: string, patch: Partial<Category>) {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Remover esta categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = rows[idx + dir];
    if (!target) return;
    const cur = rows[idx];
    await Promise.all([
      supabase.from("categories").update({ sort_order: target.sort_order }).eq("id", cur.id),
      supabase.from("categories").update({ sort_order: cur.sort_order }).eq("id", target.id),
    ]);
    load();
  }

  return (
    <div className="px-8 lg:px-14 py-12 max-w-4xl">
      <Link
        to="/app/admin/content"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> conteúdos
      </Link>

      <h2 className="font-display text-3xl mb-8">Categorias</h2>

      <div className="border border-border p-6 mb-10 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">nova categoria</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex: IA & Automação)"
          className="bg-card border-border"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição curta (opcional)"
          rows={2}
          className="bg-card border-border resize-none"
        />
        <div className="flex items-center gap-3">
          <Button onClick={create}><Plus className="w-4 h-4 mr-2" /> criar</Button>
          {name ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              slug: {slugify(name)}
            </span>
          ) : null}
        </div>
        {error ? <p className="font-mono text-[11px] text-destructive">{error}</p> : null}
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/50 border-b border-border">
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <th className="text-left p-4">nome</th>
              <th className="text-left p-4">slug</th>
              <th className="text-left p-4">descrição</th>
              <th className="p-4 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-3">
                  <Input
                    defaultValue={r.name}
                    onBlur={(e) => e.target.value !== r.name && update(r.id, { name: e.target.value })}
                    className="bg-transparent border-transparent hover:border-border focus:border-border"
                  />
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{r.slug}</td>
                <td className="p-3">
                  <Input
                    defaultValue={r.description ?? ""}
                    onBlur={(e) => (e.target.value || null) !== r.description && update(r.id, { description: e.target.value || null })}
                    className="bg-transparent border-transparent hover:border-border focus:border-border"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(r.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground text-sm">Nenhuma categoria ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
