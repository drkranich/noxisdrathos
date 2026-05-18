import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/app/admin/media")({
  head: () => ({ meta: [{ title: "Mídia — Admin" }, { name: "robots", content: "noindex" }] }),
  component: MediaPage,
});

type Asset = { id: string; bucket: string; path: string; file_name: string; mime_type: string; size_bytes: number; asset_role: string; status: string; created_at: string; content_id: string | null };

function MediaPage() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("media_assets").select("id,bucket,path,file_name,mime_type,size_bytes,asset_role,status,created_at,content_id").order("created_at", { ascending: false }).limit(200); setRows((data ?? []) as Asset[]); setLoading(false); }
  useEffect(() => { load(); const ch = supabase.channel("admin-media").on("postgres_changes", { event: "*", schema: "public", table: "media_assets" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  async function open(a: Asset) { try { window.open(await getSignedUrl(a.bucket, a.path, 900) ?? "", "_blank"); } catch (e) { alert(e instanceof Error ? e.message : "Falha ao assinar URL"); } }
  return <div className="px-8 lg:px-14 py-12 space-y-6"><div><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">diagnóstico · arquivos</p><h2 className="font-display text-3xl mt-2">Media registry</h2></div><div className="border border-border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-card/50 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><tr><th className="p-4 text-left">arquivo</th><th className="p-4 text-left">bucket</th><th className="p-4 text-left">papel</th><th className="p-4 text-left">sync</th><th className="p-4 text-left">signed url</th></tr></thead><tbody>{rows.map((a) => <tr key={a.id} className="border-t border-border/60"><td className="p-4"><div>{a.file_name}</div><div className="text-xs text-muted-foreground">{Math.round(a.size_bytes / 1024)} KB · {a.mime_type}</div></td><td className="p-4 font-mono text-xs">{a.bucket}</td><td className="p-4 font-mono text-xs">{a.asset_role}</td><td className="p-4 font-mono text-xs">{a.status}{a.content_id ? " · attached" : " · unassigned"}</td><td className="p-4"><button onClick={() => open(a)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><ExternalLink className="w-4 h-4" /> testar</button></td></tr>)}{!loading && rows.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhuma mídia sincronizada.</td></tr> : null}</tbody></table></div></div>;
}
