import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BUCKET_RULES, uploadToBucket, type PublishingBucket } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/app/admin/uploads")({
  head: () => ({ meta: [{ title: "Uploads — Admin" }, { name: "robots", content: "noindex" }] }),
  component: UploadsPage,
});

const BUCKETS: PublishingBucket[] = ["videos", "pdfs", "audio", "section-thumbnails", "content-banners", "attachments"];

type UploadState = { bucket: PublishingBucket; name: string; progress: number; status: "enviando" | "sincronizado" | "falhou"; error?: string };
type Asset = { id: string; name: string; storage_path: string; bucket: string; created_at: string; size_bytes: number | null };

function UploadsPage() {
  const { user } = useAuth();
  const [bucket, setBucket] = useState<PublishingBucket>("videos");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  async function loadAssets() {
    setLoadingAssets(true);
    const { data } = await supabase
      .from("media_assets")
      .select("id,name,storage_path,bucket,created_at,size_bytes")
      .order("created_at", { ascending: false })
      .limit(100);
    setAssets((data ?? []) as Asset[]);
    setLoadingAssets(false);
  }

  useEffect(() => { loadAssets(); }, []);

  const filteredAssets = assets.filter((a) => a.bucket === bucket);

  async function deleteAsset(asset: Asset) {
    if (!confirm(`Excluir "${asset.name}"?`)) return;
    // Remove do storage
    await supabase.storage.from(asset.bucket as PublishingBucket).remove([asset.storage_path]);
    // Remove do banco
    await supabase.from("media_assets").delete().eq("id", asset.id);
    toast.success("Arquivo excluído.");
    loadAssets();
  }

  function getPublicUrl(asset: Asset) {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.storage_path);
    return data.publicUrl;
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleFiles(files: FileList | File[]) {
    if (!user?.id) return toast.error("Sessão administrativa expirada.");
    for (const file of Array.from(files)) {
      setUploads((u) => [{ bucket, name: file.name, progress: 1, status: "enviando" }, ...u]);
      try {
        const asset = await uploadToBucket({
          bucket, file,
          pathPrefix: `admin/${user.id}/manual`,
          onProgress: (progress) => setUploads((u) => u.map((x) => x.name === file.name ? { ...x, progress } : x))
        });
        // Registra em media_assets
        await supabase.from("media_assets").insert({
          name: file.name,
          storage_path: asset.path,
          bucket,
          status: "uploaded",
          size_bytes: file.size,
          created_by: user.id,
          path: asset.path,
        });
        setUploads((u) => u.map((x) => x.name === file.name ? { ...x, progress: 100, status: "sincronizado" } : x));
        toast.success(`${file.name} enviado.`);
        loadAssets();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload falhou";
        setUploads((u) => u.map((x) => x.name === file.name ? { ...x, status: "falhou", error: message } : x));
        toast.error(message);
      }
    }
  }

  return (
    <div className="px-8 lg:px-14 py-12 space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">storage · operação</p>
        <h2 className="font-display text-3xl mt-2">Uploads</h2>
      </div>

      {/* Seletor de bucket */}
      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <button key={b} onClick={() => setBucket(b)}
            className={(bucket === b ? "bg-accent text-foreground " : "text-muted-foreground ") + "border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em]"}>
            {b}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="min-h-48 border border-dashed border-border bg-card/30 grid place-items-center cursor-pointer"
      >
        <input type="file" multiple className="hidden"
          accept={BUCKET_RULES[bucket].accept.source}
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <div className="text-center">
          <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em]">arraste arquivos para {bucket}</p>
        </div>
      </label>

      {/* Uploads em andamento */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((u, i) => (
            <div key={`${u.name}-${i}`} className="border border-border p-4 bg-card/30">
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate">{u.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{u.status}</span>
              </div>
              <Progress value={u.progress} className="mt-3" />
              {u.error && <p className="mt-2 text-xs text-destructive">{u.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Arquivos salvos no banco */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          arquivos em {bucket} · {filteredAssets.length} item{filteredAssets.length !== 1 ? "s" : ""}
        </h3>
        {loadingAssets ? (
          <p className="text-sm text-muted-foreground">carregando…</p>
        ) : filteredAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo neste bucket ainda.</p>
        ) : (
          <div className="space-y-2">
            {filteredAssets.map((a) => (
              <div key={a.id} className="border border-border p-4 bg-card/30 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.name || a.storage_path.split("/").pop()}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                    {formatBytes(a.size_bytes)} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <a href={getPublicUrl(a)} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition p-1">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => deleteAsset(a)}
                  className="text-muted-foreground hover:text-destructive transition p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
