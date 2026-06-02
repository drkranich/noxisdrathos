import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileAudio, FileText, Film, Image as ImageIcon, RefreshCcw, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteFromBucket, getSignedUrl, uploadToBucket, type PublishingBucket } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/app/admin/media")({
  head: () => ({ meta: [{ title: "Mídia — Admin" }, { name: "robots", content: "noindex" }] }),
  component: MediaPage,
});

type Asset = {
  id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  asset_role: string;
  status: string;
  created_at: string;
  content_id: string | null;
  content?: { title: string | null; visibility: string | null; status: string | null; type: string | null } | null;
};

const BUCKETS: PublishingBucket[] = ["videos", "pdfs", "audio", "section-thumbnails", "content-banners", "attachments"];

function isPublishingBucket(bucket: string): bucket is PublishingBucket {
  return BUCKETS.includes(bucket as PublishingBucket);
}

function iconFor(asset: Asset) {
  if (asset.mime_type.startsWith("image/")) return ImageIcon;
  if (asset.mime_type.startsWith("video/")) return Film;
  if (asset.mime_type.startsWith("audio/")) return FileAudio;
  return FileText;
}

function MediaPage() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_assets")
      .select("id,bucket,path,file_name,mime_type,size_bytes,asset_role,status,created_at,content_id,content:content_id(title,visibility,status,type)")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) toast.error(error.message);
    const next = (data ?? []) as unknown as Asset[];
    setRows(next);
    setLoading(false);
    const previews: Record<string, string> = {};
    await Promise.all(next.map(async (asset) => {
      if (!asset.mime_type.startsWith("image/")) return;
      try { previews[asset.id] = await getSignedUrl(asset.bucket, asset.path, 1800) ?? ""; } catch {}
    }));
    setThumbs(previews);
  }

  useEffect(() => { load(); const ch = supabase.channel("admin-media").on("postgres_changes", { event: "*", schema: "public", table: "media_assets" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);

  async function open(asset: Asset) { try { window.open(await getSignedUrl(asset.bucket, asset.path, 900) ?? "", "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not preview file"); } }
  async function remove(asset: Asset) { if (!confirm(`Delete ${asset.file_name}?`)) return; try { await deleteFromBucket(asset.bucket, asset.path); const { error } = await supabase.from("media_assets").delete().eq("id", asset.id); if (error) throw error; toast.success("Media deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); } }
  async function reprocess(asset: Asset) { const { error } = await supabase.from("media_assets").update({ status: "reprocess_requested" }).eq("id", asset.id); if (error) toast.error(error.message); else { toast.success("Reprocess requested"); load(); } }
  async function replace(asset: Asset, file: File) {
    if (!isPublishingBucket(asset.bucket)) { toast.error("Unsupported bucket for replacement"); return; }
    setUploading((u) => ({ ...u, [asset.id]: 1 }));
    try {
      const uploaded = await uploadToBucket({ bucket: asset.bucket, file, pathPrefix: `admin/replacements/${asset.id}`, onProgress: (pct) => setUploading((u) => ({ ...u, [asset.id]: pct })) });
      const { error } = await supabase.from("media_assets").update({ path: uploaded.path, file_name: uploaded.fileName, mime_type: uploaded.mimeType, size_bytes: uploaded.sizeBytes, status: asset.content_id ? "attached" : "uploaded" }).eq("id", asset.id);
      if (error) throw error;
      await deleteFromBucket(asset.bucket, asset.path).catch(() => undefined);
      toast.success("Media replaced");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally {
      setUploading((u) => ({ ...u, [asset.id]: 0 }));
    }
  }

  const filtered = useMemo(() => rows.filter((asset) => [asset.file_name, asset.bucket, asset.asset_role, asset.content?.title, asset.mime_type].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())), [rows, q]);

  return (
    <div className="px-8 lg:px-14 py-12 space-y-7">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">cms · media operations</p>
          <h1 className="font-display text-5xl mt-2">Media Manager</h1>
        </div>
        <div className="relative min-w-[260px] max-w-md flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search uploaded files…" className="bg-card border-border" />
        </div>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-card/50 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <tr><th className="p-4 text-left">Thumbnail</th><th className="p-4 text-left">Type</th><th className="p-4 text-left">Title</th><th className="p-4 text-left">Upload Date</th><th className="p-4 text-left">Status</th><th className="p-4 text-left">Visibility</th><th className="p-4 text-left">Storage Status</th><th className="p-4 text-right">Buttons</th></tr>
          </thead>
          <tbody>
            {filtered.map((asset) => {
              const Icon = iconFor(asset);
              const progress = uploading[asset.id] ?? 0;
              return (
                <tr key={asset.id} className="border-t border-border/60 hover:bg-card/30">
                  <td className="p-4"><div className="h-16 w-28 border border-border bg-card overflow-hidden">{thumbs[asset.id] ? <img src={thumbs[asset.id]} alt={`${asset.file_name} thumbnail`} className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-muted-foreground"><Icon className="w-5 h-5" /></div>}</div>{progress ? <Progress value={progress} className="mt-2 w-28" /> : null}</td>
                  <td className="p-4"><div className="font-mono text-xs uppercase">{asset.asset_role}</div><div className="text-xs text-muted-foreground">{asset.mime_type}</div></td>
                  <td className="p-4"><div className="font-medium">{asset.content?.title || asset.file_name}</div><div className="text-xs text-muted-foreground truncate max-w-[280px]">{asset.bucket}/{asset.path}</div></td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{new Date(asset.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-4 font-mono text-xs uppercase">{asset.status}</td>
                  <td className="p-4 font-mono text-xs uppercase">{asset.content?.visibility || "unassigned"}</td>
                  <td className="p-4"><span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neon"><span className="neon-dot" /> stored · {Math.round(asset.size_bytes / 1024)} KB</span></td>
                  <td className="p-4"><div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" onClick={() => open(asset)}><Eye className="w-4 h-4" /> Preview</Button><label className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent cursor-pointer"><UploadCloud className="w-4 h-4" /> Replace<input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) replace(asset, file); e.target.value = ""; }} /></label><Button variant="outline" size="sm" onClick={() => remove(asset)}><Trash2 className="w-4 h-4" /> Delete</Button><Button variant="outline" size="sm" onClick={() => reprocess(asset)}><RefreshCcw className="w-4 h-4" /> Reprocess</Button></div></td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No uploaded files found.</td></tr> : null}
            {loading ? <tr><td colSpan={8} className="p-12 text-center text-muted-foreground"><RotateCcw className="w-4 h-4 inline mr-2" /> Loading media…</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
