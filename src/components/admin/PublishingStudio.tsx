import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, FileText, Image as ImageIcon, RotateCcw, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getSignedUrl, uploadToBucket, type PublishingBucket } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Category = { id: string; name: string; slug: string };
type UploadRole = "primary" | "thumbnail" | "banner" | "trailer" | "attachment" | "preview";

const TYPES = ["video", "pdf", "audio", "article"] as const;
const KINDS = ["article", "video", "pdf", "audio", "report", "briefing", "premium_drop", "collection", "hero_banner"] as const;
const VISIBILITIES = ["public", "members", "premium"] as const;
const PLANS = ["free", "circle", "vault", "council", "premium", "vip", "beta"] as const;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bucketForType(type: string): PublishingBucket {
  if (type === "video") return "videos";
  if (type === "pdf") return "pdfs";
  if (type === "audio") return "audio";
  return "attachments";
}

export function PublishingStudio({ contentId = "new" }: { contentId?: string }) {
  const id = contentId;
  const nav = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewMd, setPreviewMd] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("article");
  const [contentKind, setContentKind] = useState<(typeof KINDS)[number]>("article");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("members");
  const [requiredPlan, setRequiredPlan] = useState<(typeof PLANS)[number]>("free");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [publishAt, setPublishAt] = useState<string>("");
  const [scheduled, setScheduled] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  const [thumbPath, setThumbPath] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [storageBucket, setStorageBucket] = useState<PublishingBucket | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [trailerBucket, setTrailerBucket] = useState<PublishingBucket | null>(null);
  const [trailerPath, setTrailerPath] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<{ bucket: PublishingBucket; path: string; name: string }>>([]);
  const [externalUrl, setExternalUrl] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [readingMin, setReadingMin] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; title: string }>>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const slugDirty = useRef(false);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("sort_order").then(({ data }) => setCategories((data ?? []) as Category[]));
    supabase.from("collections").select("id,title").order("sort_order").then(({ data }) => setCollections((data ?? []) as Array<{ id: string; title: string }>));
  }, []);

  useEffect(() => {
    if (isNew) return;
    supabase.from("content").select("*").eq("id", id).single().then(async ({ data, error }) => {
      if (error || !data) { setError(error?.message ?? "Não encontrado"); setLoading(false); return; }
      setTitle(data.title); setSlug(data.slug); setSubtitle(data.subtitle ?? ""); setDescription(data.description ?? "");
      setPreviewMd(data.preview_md ?? ""); setBodyMd(data.body_md ?? ""); setType(data.type as typeof type); setContentKind((data.content_kind ?? data.type) as typeof contentKind);
      setVisibility(data.visibility as typeof visibility); setRequiredPlan((data.required_plan_id ?? "free") as typeof requiredPlan); setCategoryId(data.category_id);
      setTags((data.tags ?? []).join(", ")); setFeatured(data.is_featured); setSortOrder(String(data.sort_order ?? 0));
      if (data.publish_at) { setScheduled(true); setPublishAt(new Date(data.publish_at).toISOString().slice(0, 16)); }
      setStorageBucket(data.storage_bucket as PublishingBucket | null); setStoragePath(data.storage_path); setExternalUrl(data.external_url ?? "");
      setDuration(data.duration_seconds ? String(data.duration_seconds) : ""); setReadingMin(data.reading_minutes ? String(data.reading_minutes) : "");
      setTrailerBucket(data.trailer_bucket as PublishingBucket | null); setTrailerPath(data.trailer_path); setBannerPath(data.banner_path);
      if (data.attachment_paths && Array.isArray(data.attachment_paths)) setAttachments(data.attachment_paths as Array<{ bucket: PublishingBucket; path: string; name: string }>);
      supabase.from("collection_items").select("collection_id").eq("content_id", id).limit(1).maybeSingle().then(({ data }) => setCollectionId(data?.collection_id ?? null));
      if (data.thumbnail_url) { setThumbPath(data.thumbnail_url); try { setThumbPreview(await getSignedUrl(data.thumbnail_bucket || "thumbnails", data.thumbnail_url, 3600)); } catch {} }
      if (data.banner_path && data.banner_bucket) { try { setBannerPreview(await getSignedUrl(data.banner_bucket, data.banner_path, 3600)); } catch {} }
      setLoading(false); slugDirty.current = true;
    });
  }, [id, isNew]);

  function onTitleChange(v: string) { setTitle(v); if (!slugDirty.current) setSlug(slugify(v)); }

  async function recordAsset(asset: Awaited<ReturnType<typeof uploadToBucket>>, role: UploadRole, contentId?: string | null) {
    if (!user?.id) throw new Error("Sessão administrativa expirada. Entre novamente.");
    await supabase.from("media_assets").upsert({
      content_id: contentId ?? (isNew ? null : id), bucket: asset.bucket, path: asset.path, file_name: asset.fileName,
      mime_type: asset.mimeType, size_bytes: asset.sizeBytes, asset_role: role, status: contentId ? "attached" : "uploaded", created_by: user.id,
    }, { onConflict: "bucket,path" });
  }

  async function doUpload(bucket: PublishingBucket, file: File, role: UploadRole) {
    setError(null); setUploadProgress((p) => ({ ...p, [role]: 1 }));
    try {
      const asset = await uploadToBucket({ bucket, file, pathPrefix: role, onProgress: (pct) => setUploadProgress((p) => ({ ...p, [role]: pct })) });
      await recordAsset(asset, role);
      toast.success("Upload concluído");
      return asset;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha no upload";
      setError(message); toast.error(message); throw e;
    } finally {
      setTimeout(() => setUploadProgress((p) => ({ ...p, [role]: 0 })), 900);
    }
  }

  async function uploadThumbnail(file: File) { const a = await doUpload("thumbnails", file, "thumbnail"); setThumbPath(a.path); setThumbPreview(await getSignedUrl("thumbnails", a.path, 3600)); }
  async function uploadBanner(file: File) { const a = await doUpload("banners", file, "banner"); setBannerPath(a.path); setBannerPreview(await getSignedUrl("banners", a.path, 3600)); }
  async function uploadPrimary(file: File) { const bucket = bucketForType(type); const a = await doUpload(bucket, file, "primary"); setStorageBucket(bucket); setStoragePath(a.path); }
  async function uploadTrailer(file: File) { const a = await doUpload("videos", file, "trailer"); setTrailerBucket("videos"); setTrailerPath(a.path); }
  async function uploadAttachment(file: File) { const a = await doUpload("attachments", file, "attachment"); setAttachments((prev) => [...prev, { bucket: "attachments", path: a.path, name: a.fileName }]); }

  async function save(targetStatus: "draft" | "scheduled" | "published") {
    setSaving(true); setError(null);
    let finalStatus: "draft" | "scheduled" | "published" = targetStatus;
    let publishTs: string | null = scheduled && publishAt ? new Date(publishAt).toISOString() : null;
    if (publishTs && targetStatus !== "draft" && new Date(publishTs) > new Date()) finalStatus = "scheduled";
    if (!user?.id) { setError("Sessão administrativa expirada. Entre novamente."); setSaving(false); return; }
    if (!title.trim()) { setError("O título é obrigatório."); setSaving(false); return; }

    const payload = {
      title: title.trim(), slug: slug.trim() || slugify(title), subtitle: subtitle.trim() || null, description: description.trim() || null,
      preview_md: previewMd.trim() || null, body_md: bodyMd || null, type, content_kind: contentKind, visibility, required_plan_id: requiredPlan,
      status: finalStatus, category_id: categoryId, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), is_featured: featured,
      publish_at: publishTs, thumbnail_bucket: "thumbnails", thumbnail_url: thumbPath, banner_bucket: bannerPath ? "banners" : null, banner_path: bannerPath,
      storage_bucket: storageBucket, storage_path: storagePath, trailer_bucket: trailerBucket, trailer_path: trailerPath, attachment_paths: attachments,
      external_url: externalUrl.trim() || null, duration_seconds: duration ? Number(duration) : null, reading_minutes: readingMin ? Number(readingMin) : null,
      sort_order: Number(sortOrder) || 0, media_metadata: { attachments: attachments.length, hasTrailer: !!trailerPath, collectionId }, created_by: user.id,
    };

    const { data, error } = isNew ? await supabase.from("content").insert(payload).select("id").single() : await supabase.from("content").update(payload).eq("id", id).select("id").single();
    setSaving(false);
    if (error) { setError(error.message); toast.error(error.message); return; }
    const savedId = data?.id ?? id;
    if (collectionId) {
      await supabase.from("collection_items").upsert({ collection_id: collectionId, content_id: savedId, sort_order: Number(sortOrder) || 0 }, { onConflict: "collection_id,content_id" });
    } else if (!isNew) {
      await supabase.from("collection_items").delete().eq("content_id", savedId);
    }
    await supabase.from("admin_logs").insert({ actor_id: user.id, action: `content_${finalStatus}`, target_table: "content", target_id: data?.id ?? id, metadata: { title: payload.title, type, contentKind } });
    if (data?.id) await supabase.from("media_assets").update({ content_id: data.id, status: "attached" }).is("content_id", null);
    toast.success(finalStatus === "published" ? "Conteúdo publicado" : finalStatus === "scheduled" ? "Publicação agendada" : "Rascunho salvo");
    if (isNew && data?.id) nav({ to: "/app/admin/content/$id", params: { id: data.id }, replace: true });
  }

  if (loading) return <div className="px-8 lg:px-14 py-12 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">carregando…</div>;

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/app/admin/content" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"><ArrowLeft className="w-3.5 h-3.5" /> conteúdos</Link>
        <div className="ml-auto flex items-center gap-2"><Button variant="outline" disabled={saving} onClick={() => save("draft")}><Save className="w-4 h-4 mr-2" /> salvar rascunho</Button><Button disabled={saving} onClick={() => save("published")}><Eye className="w-4 h-4 mr-2" /> {scheduled ? "agendar" : "publicar"}</Button></div>
      </div>
      {error ? <div className="mb-6 border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-[11px] text-destructive">{error}</div> : null}
      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        <div className="space-y-6">
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Título do conteúdo" className="font-display text-3xl h-auto py-3 bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground" />
          <Input value={slug} onChange={(e) => { slugDirty.current = true; setSlug(slugify(e.target.value)); }} placeholder="slug-amigavel" className="font-mono text-xs bg-card border-border" />
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo" className="bg-card border-border" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição curta…" rows={3} className="bg-card border-border resize-none" />
          <Tabs defaultValue="body"><TabsList><TabsTrigger value="preview">prévia bloqueada</TabsTrigger><TabsTrigger value="body">corpo completo</TabsTrigger></TabsList><TabsContent value="preview"><Textarea value={previewMd} onChange={(e) => setPreviewMd(e.target.value)} rows={8} placeholder="Texto visível antes do desbloqueio…" className="bg-card border-border font-mono text-sm" /></TabsContent><TabsContent value="body"><Textarea value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} rows={20} placeholder="# Conteúdo em markdown" className="bg-card border-border font-mono text-sm resize-y min-h-[400px]" /></TabsContent></Tabs>
        </div>
        <aside className="space-y-6">
          <Section label="thumbnail privada"><PreviewImage src={thumbPreview} /><FileButton accept="image/*" onPick={uploadThumbnail} loadingPct={uploadProgress.thumbnail} label={thumbPath ? "trocar thumbnail" : "enviar thumbnail"} /></Section>
          <Section label="banner / hero"><PreviewImage src={bannerPreview} /><FileButton accept="image/*" onPick={uploadBanner} loadingPct={uploadProgress.banner} label={bannerPath ? "trocar banner" : "enviar banner"} /></Section>
          <Section label="tipo e conteúdo"><Select value={type} onValueChange={(v) => { setType(v as typeof type); if (["video", "pdf", "audio", "article"].includes(v)) setContentKind(v as typeof contentKind); }}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><Select value={contentKind} onValueChange={(v) => setContentKind(v as typeof contentKind)}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></Section>
          {type !== "article" ? <Section label="arquivo principal privado"><AssetLine path={storagePath} onRemove={() => { setStoragePath(null); setStorageBucket(null); }} /><FileButton accept={type === "pdf" ? "application/pdf" : type === "video" ? "video/*" : "audio/*"} onPick={uploadPrimary} loadingPct={uploadProgress.primary} label={storagePath ? "substituir arquivo" : "enviar arquivo"} /></Section> : null}
          {type === "video" ? <Section label="trailer preview"><AssetLine path={trailerPath} onRemove={() => { setTrailerPath(null); setTrailerBucket(null); }} /><FileButton accept="video/*" onPick={uploadTrailer} loadingPct={uploadProgress.trailer} label={trailerPath ? "substituir trailer" : "enviar trailer"} /></Section> : null}
          <Section label="anexos"><div className="space-y-2">{attachments.map((a) => <AssetLine key={a.path} path={a.name || a.path} onRemove={() => setAttachments((prev) => prev.filter((x) => x.path !== a.path))} />)}</div><FileButton accept="application/pdf,image/*,text/*,application/zip,application/json" onPick={uploadAttachment} loadingPct={uploadProgress.attachment} label="adicionar anexo" /></Section>
          <Section label="acesso"><Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{VISIBILITIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={requiredPlan} onValueChange={(v) => setRequiredPlan(v as typeof requiredPlan)}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Section>
          <Section label="categoria"><Select value={categoryId ?? "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}><SelectTrigger className="bg-card border-border"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">sem categoria</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Section>
          <Section label="coleção"><Select value={collectionId ?? "none"} onValueChange={(v) => setCollectionId(v === "none" ? null : v)}><SelectTrigger className="bg-card border-border"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="none">sem coleção</SelectItem>{collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></Section>
          <Section label="tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ia, automação…" className="bg-card border-border" /></Section>
          <Section label="operação"><Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^0-9-]/g, ""))} placeholder="ordem" className="bg-card border-border" /><div className="flex items-center justify-between"><span className="text-sm">agendar</span><Switch checked={scheduled} onCheckedChange={setScheduled} /></div>{scheduled ? <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="bg-card border-border" /> : null}<div className="flex items-center justify-between"><span className="text-sm">destaque</span><Switch checked={featured} onCheckedChange={setFeatured} /></div></Section>
          <Section label="metadados"><Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="URL externa opcional" className="bg-card border-border" /><Input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} placeholder="duração em segundos" className="bg-card border-border" /><Input value={readingMin} onChange={(e) => setReadingMin(e.target.value.replace(/\D/g, ""))} placeholder="minutos de leitura" className="bg-card border-border" /></Section>
        </aside>
      </div>
    </div>
  );
}

export function Section({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p><div className="space-y-2">{children}</div></div>; }
export function PreviewImage({ src }: { src?: string | null }) { return <div className="aspect-[16/9] border border-border bg-card relative overflow-hidden">{src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageIcon className="w-8 h-8" /></div>}</div>; }
export function AssetLine({ path, onRemove }: { path?: string | null; onRemove: () => void }) { return path ? <div className="border border-border bg-card p-3 flex items-center gap-3 text-xs font-mono"><FileText className="w-4 h-4" /><span className="truncate flex-1">{path.split("/").pop()}</span><button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">remover</button></div> : null; }
export function FileButton({ accept, onPick, loadingPct, label }: { accept: string; onPick: (f: File) => void; loadingPct?: number; label: string }) {
  const ref = useRef<HTMLInputElement>(null); const loading = !!loadingPct && loadingPct > 0 && loadingPct < 100;
  return <><input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} /><Button type="button" variant="outline" disabled={loading} onClick={() => ref.current?.click()} className="w-full"><Upload className="w-4 h-4 mr-2" />{loading ? `enviando ${loadingPct}%` : label}</Button>{loadingPct === 100 ? <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><RotateCcw className="w-3 h-3" /> validando registro…</p> : null}</>;
}
