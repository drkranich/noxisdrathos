import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BUCKET_RULES, uploadToBucket, type PublishingBucket } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/app/admin/uploads")({
  head: () => ({ meta: [{ title: "Uploads — Admin" }, { name: "robots", content: "noindex" }] }),
  component: UploadsPage,
});

const BUCKETS: PublishingBucket[] = ["videos", "pdfs", "audio", "thumbnails", "banners", "attachments"];

type UploadState = { bucket: PublishingBucket; name: string; progress: number; status: "enviando" | "sincronizado" | "falhou"; error?: string };

function UploadsPage() {
  const { user } = useAuth();
  const [bucket, setBucket] = useState<PublishingBucket>("videos");
  const [uploads, setUploads] = useState<UploadState[]>([]);

  async function handleFiles(files: FileList | File[]) {
    if (!user?.id) return toast.error("Sessão administrativa expirada.");
    for (const file of Array.from(files)) {
      setUploads((u) => [{ bucket, name: file.name, progress: 1, status: "enviando" }, ...u]);
      try {
        const asset = await uploadToBucket({ bucket, file, pathPrefix: `admin/${user.id}/manual`, onProgress: (progress) => setUploads((u) => u.map((x) => x.name === file.name ? { ...x, progress } : x)) });
        const { error } = await supabase.from("media_assets").upsert({ bucket: asset.bucket, path: asset.path, file_name: asset.fileName, mime_type: asset.mimeType, size_bytes: asset.sizeBytes, asset_role: bucket === "thumbnails" ? "thumbnail" : bucket === "banners" ? "banner" : "primary", status: "uploaded", created_by: user.id }, { onConflict: "bucket,path" });
        if (error) throw error;
        setUploads((u) => u.map((x) => x.name === file.name ? { ...x, progress: 100, status: "sincronizado" } : x));
        toast.success(`${file.name} sincronizado`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload falhou";
        setUploads((u) => u.map((x) => x.name === file.name ? { ...x, status: "falhou", error: message } : x));
        toast.error(message);
      }
    }
  }

  return <div className="px-8 lg:px-14 py-12 space-y-8"><div><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">storage · operação</p><h2 className="font-display text-3xl mt-2">Uploads</h2></div><div className="flex flex-wrap gap-2">{BUCKETS.map((b) => <button key={b} onClick={() => setBucket(b)} className={(bucket === b ? "bg-accent text-foreground " : "text-muted-foreground ") + "border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em]"}>{b}</button>)}</div><label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }} className="min-h-64 border border-dashed border-border bg-card/30 grid place-items-center cursor-pointer"><input type="file" multiple className="hidden" accept={BUCKET_RULES[bucket].accept.source} onChange={(e) => e.target.files && handleFiles(e.target.files)} /><div className="text-center"><UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" /><p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em]">arraste arquivos para {bucket}</p><p className="mt-2 text-sm text-muted-foreground">Validação, upload autenticado e sincronização em media_assets.</p></div></label><div className="space-y-3">{uploads.map((u, i) => <div key={`${u.name}-${i}`} className="border border-border p-4 bg-card/30"><div className="flex justify-between gap-4 text-sm"><span className="truncate">{u.name}</span><span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{u.status}</span></div><Progress value={u.progress} className="mt-3" />{u.error ? <p className="mt-2 text-xs text-destructive">{u.error}</p> : null}</div>)}</div></div>;
}
