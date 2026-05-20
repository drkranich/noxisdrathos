import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Eye, FileText, Image as ImageIcon, RotateCcw, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { getSignedUrl, uploadToBucket, type PublishingBucket } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Category = { id: string; name: string; slug: string };
type UploadRole = "primary" | "thumbnail" | "banner" | "trailer" | "attachment" | "preview";
type StudioKind = "video" | "pdf" | "audio" | "article" | "report";
type ContentType = "video" | "pdf" | "audio" | "article";
type ContentKind = "article" | "video" | "pdf" | "audio" | "report" | "briefing" | "premium_drop" | "collection" | "hero_banner";
type Visibility = "public" | "members" | "premium";

const TYPES: ContentType[] = ["video", "pdf", "audio", "article"];
const KINDS: ContentKind[] = ["article", "video", "pdf", "audio", "report", "briefing", "premium_drop", "collection", "hero_banner"];
const VISIBILITIES: Visibility[] = ["public", "members", "premium"];
const PLANS = ["free", "premium", "vip", "beta"] as const;

const KIND_COPY: Record<StudioKind, { title: string; primary: string; accept: string; type: ContentType; kind: ContentKind }> = {
  video: { title: "New Video", primary: "Video Upload", accept: "video/*", type: "video", kind: "video" },
  pdf: { title: "New PDF", primary: "PDF Upload", accept: "application/pdf", type: "pdf", kind: "pdf" },
  audio: { title: "New Audio", primary: "Audio Upload", accept: "audio/*", type: "audio", kind: "audio" },
  article: { title: "New Article", primary: "Article Attachments", accept: "application/pdf,image/*,text/*,application/zip,application/json", type: "article", kind: "article" },
  report: { title: "New Report", primary: "Report PDF Upload", accept: "application/pdf", type: "pdf", kind: "report" },
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bucketForType(type: string): PublishingBucket {
  if (type === "video") return "videos";
  if (type === "pdf") return "pdfs";
  if (type === "audio") return "audio";
  return "attachments";
}

function kindFromType(type: string, contentKind?: string | null): StudioKind {
  if (contentKind === "report") return "report";
  if (type === "video" || type === "pdf" || type === "audio") return type;
  return "article";
}

export function PublishingStudio({
  contentId = "new",
  initialKind = "article",
  embedded = false,
  onSaved,
  onCancel,
}: {
  contentId?: string;
  initialKind?: StudioKind;
  embedded?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const id = contentId;
  const nav = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new";
  const initial = KIND_COPY[initialKind];

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [studioKind, setStudioKind] = useState<StudioKind>(initialKind);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewMd, setPreviewMd] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [type, setType] = useState<ContentType>(initial.type);
  const [contentKind, setContentKind] = useState<ContentKind>(initial.kind);
  const [visibility, setVisibility] = useState<Visibility>("members");
  const [requiredPlan, setRequiredPlan] = useState<(typeof PLANS)[number]>("free");
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
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
  const [metadataNote, setMetadataNote] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; title: string }>>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const slugDirty = useRef(false);
  const uploadBatch = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

  useEffect(() => {
    if (!isNew) return;
    const copy = KIND_COPY[initialKind];
    setStudioKind(initialKind);
    setType(copy.type);
    setContentKind(copy.kind);
  }, [initialKind, isNew]);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("sort_order").then(({ data }) => setCategories((data ?? []) as Category[]));
    supabase.from("collections").select("id,title").order("sort_order").then(({ data }) => setCollections((data ?? []) as Array<{ id: string; title: string }>));
  }, []);

  useEffect(() => {
    if (isNew) return;
    supabase.from("content").select("*").eq("id", id).single().then(async ({ data, error }) => {
      if (error || !data) { setError(error?.message ?? "Não encontrado"); setLoading(false); return; }
      setTitle(data.title); setSlug(data.slug); setSubtitle(data.subtitle ?? ""); setDescription(data.description ?? "");
      setPreviewMd(data.preview_md ?? ""); setBodyMd(data.body_md ?? ""); setType(data.type as ContentType); setContentKind((data.content_kind ?? data.type) as ContentKind);
      setStudioKind(kindFromType(data.type, data.content_kind));
      setVisibility(data.visibility as Visibility); setRequiredPlan(PLANS.includes(data.required_plan_id as typeof requiredPlan) ? (data.required_plan_id as typeof requiredPlan) : "free"); setCategoryId(data.category_id);
      setTags((data.tags ?? []).join(", ")); setFeatured(data.is_featured); setSortOrder(String(data.sort_order ?? 0));
      if (data.publish_at) { setScheduled(true); setPublishAt(new Date(data.publish_at).toISOString().slice(0, 16)); }
      setPublishMode(data.status === "published" ? "published" : "draft");
      setStorageBucket(data.storage_bucket as PublishingBucket | null); setStoragePath(data.storage_path); setExternalUrl(data.external_url ?? "");
      setDuration(data.duration_seconds ? String(data.duration_seconds) : ""); setReadingMin(data.reading_minutes ? String(data.reading_minutes) : "");
      if (data.media_metadata && typeof data.media_metadata === "object" && !Array.isArray(data.media_metadata) && "metadata" in data.media_metadata) setMetadataNote(String(data.media_metadata.metadata ?? ""));
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
    const { error } = await supabase.from("media_assets").upsert({
      content_id: contentId ?? (isNew ? null : id), bucket: asset.bucket, path: asset.path, file_name: asset.fileName,
      mime_type: asset.mimeType, size_bytes: asset.sizeBytes, asset_role: role, status: contentId ? "attached" : "uploaded", created_by: user.id,
    }, { onConflict: "bucket,path" });
    if (error) throw error;
  }

  async function doUpload(bucket: PublishingBucket, file: File, role: UploadRole) {
    setError(null); setUploadProgress((p) => ({ ...p, [role]: 1 }));
    try {
      if (!user?.id) throw new Error("Sessão administrativa expirada. Entre novamente.");
      const asset = await uploadToBucket({ bucket, file, pathPrefix: `admin/${user.id}/${uploadBatch.current}/${role}`, onProgress: (pct) => setUploadProgress((p) => ({ ...p, [role]: pct })) });
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

    const payload: TablesInsert<"content"> = {
      title: title.trim(), slug: slug.trim() || slugify(title), subtitle: subtitle.trim() || null, description: description.trim() || null,
      preview_md: previewMd.trim() || null, body_md: bodyMd || null, type, content_kind: contentKind, visibility, required_plan_id: requiredPlan,
      status: finalStatus, category_id: categoryId, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), is_featured: featured,
      publish_at: publishTs, thumbnail_bucket: "thumbnails", thumbnail_url: thumbPath, banner_bucket: bannerPath ? "banners" : null, banner_path: bannerPath,
      storage_bucket: storageBucket, storage_path: storagePath, trailer_bucket: trailerBucket, trailer_path: trailerPath, attachment_paths: attachments,
      external_url: externalUrl.trim() || null, duration_seconds: duration ? Number(duration) : null, reading_minutes: readingMin ? Number(readingMin) : null,
      sort_order: Number(sortOrder) || 0, media_metadata: { attachments: attachments.length, hasTrailer: !!trailerPath, collectionId, metadata: metadataNote.trim() || null }, created_by: user.id,
    };

    const { data, error } = isNew ? await supabase.from("content").insert(payload).select("id").single() : await supabase.from("content").update(payload).eq("id", id).select("id").single();
    setSaving(false);
    if (error) { setError(error.message); toast.error(error.message); return; }
    const savedId = data?.id ?? id;
    if (collectionId) {
      const { error: collectionError } = await supabase.from("collection_items").upsert({ collection_id: collectionId, content_id: savedId, sort_order: Number(sortOrder) || 0 }, { onConflict: "collection_id,content_id" });
      if (collectionError) { setError(collectionError.message); toast.error(collectionError.message); return; }
    } else if (!isNew) {
      const { error: collectionDeleteError } = await supabase.from("collection_items").delete().eq("content_id", savedId);
      if (collectionDeleteError) { setError(collectionDeleteError.message); toast.error(collectionDeleteError.message); return; }
    }
    const { error: logError } = await supabase.from("admin_logs").insert({ actor_id: user.id, action: `content_${finalStatus}`, target_table: "content", target_id: savedId, metadata: { title: payload.title, type, contentKind, collectionId } });
    if (logError) { setError(logError.message); toast.error(logError.message); return; }
    const assetPaths = [thumbPath, bannerPath, storagePath, trailerPath, ...attachments.map((a) => a.path)].filter(Boolean) as string[];
    if (assetPaths.length) {
      const { error: assetError } = await supabase.from("media_assets").update({ content_id: savedId, status: "attached" }).in("path", assetPaths);
      if (assetError) { setError(assetError.message); toast.error(assetError.message); return; }
    }
    toast.success(finalStatus === "published" ? "Conteúdo publicado" : finalStatus === "scheduled" ? "Publicação agendada" : "Rascunho salvo");
    onSaved?.();
    if (isNew && data?.id && !embedded) nav({ to: "/app/admin/content/edit/$id", params: { id: data.id }, replace: true });
  }

  if (loading) return <div className={embedded ? "py-10 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground" : "px-8 lg:px-14 py-12 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground"}>carregando…</div>;

  const copy = KIND_COPY[studioKind];
  const shellClass = embedded ? "space-y-6" : "px-8 lg:px-14 py-10 space-y-8";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-center gap-4">
        {embedded ? (
          <button onClick={onCancel} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /> fechar</button>
        ) : (
          <Link to="/app/admin/content" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"><ArrowLeft className="w-3.5 h-3.5" /> Content Studio</Link>
        )}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">publishing form</p>
          <h2 className="font-display text-3xl mt-1">{isNew ? copy.title : `Edit ${copy.title.replace("New ", "")}`}</h2>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={saving} onClick={() => save("draft")}><Save className="w-4 h-4 mr-2" /> Save Draft</Button>
          <Button disabled={saving} onClick={() => save("published")}><Eye className="w-4 h-4 mr-2" /> {scheduled ? "Schedule" : "Publish"}</Button>
        </div>
      </div>

      {error ? <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-[11px] text-destructive">{error}</div> : null}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_430px] gap-8">
        <div className="space-y-6">
          <Panel title="Core Metadata">
            <Field label="Title"><Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Title" className="bg-card border-border" /></Field>
            <Field label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle" className="bg-card border-border" /></Field>
            <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} className="bg-card border-border resize-none" /></Field>
            <Field label="Slug"><Input value={slug} onChange={(e) => { slugDirty.current = true; setSlug(slugify(e.target.value)); }} placeholder="content-slug" className="bg-card border-border font-mono text-xs" /></Field>
          </Panel>

          <Panel title={studioKind === "audio" ? "Audio Metadata" : studioKind === "article" ? "Article Body" : studioKind === "report" ? "Report Metadata" : "Publishing Copy"}>
            {studioKind === "audio" ? <Field label="Metadata"><Textarea value={metadataNote} onChange={(e) => setMetadataNote(e.target.value)} placeholder="Host, episode number, source notes, transcript status…" rows={4} className="bg-card border-border" /></Field> : null}
            <Tabs defaultValue="body">
              <TabsList><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="body">Full Content</TabsTrigger></TabsList>
              <TabsContent value="preview"><Textarea value={previewMd} onChange={(e) => setPreviewMd(e.target.value)} rows={7} placeholder="Locked preview copy…" className="bg-card border-border font-mono text-sm" /></TabsContent>
              <TabsContent value="body"><Textarea value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} rows={16} placeholder="# Markdown body, transcript, abstract, or editorial notes" className="bg-card border-border font-mono text-sm resize-y min-h-[320px]" /></TabsContent>
            </Tabs>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Uploads">
            <Field label="Thumbnail Upload"><PreviewImage src={thumbPreview} /><FileButton accept="image/*" onPick={uploadThumbnail} loadingPct={uploadProgress.thumbnail} label={thumbPath ? "Replace Thumbnail" : "Upload Thumbnail"} /></Field>
            {studioKind !== "article" ? <Field label={copy.primary}><AssetLine path={storagePath} onRemove={() => { setStoragePath(null); setStorageBucket(null); }} /><FileButton accept={copy.accept} onPick={uploadPrimary} loadingPct={uploadProgress.primary} label={storagePath ? `Replace ${copy.primary}` : copy.primary} /></Field> : null}
            {studioKind === "video" ? <Field label="Trailer / Preview Upload"><AssetLine path={trailerPath} onRemove={() => { setTrailerPath(null); setTrailerBucket(null); }} /><FileButton accept="video/*" onPick={uploadTrailer} loadingPct={uploadProgress.trailer} label={trailerPath ? "Replace Trailer" : "Upload Trailer"} /></Field> : null}
            <Field label="Upload Button / Attachments"><div className="space-y-2">{attachments.map((a) => <AssetLine key={a.path} path={a.name || a.path} onRemove={() => setAttachments((prev) => prev.filter((x) => x.path !== a.path))} />)}</div><FileButton accept="application/pdf,image/*,text/*,application/zip,application/json" onPick={uploadAttachment} loadingPct={uploadProgress.attachment} label="Upload Attachment" /></Field>
          </Panel>

          <Panel title="Publishing Controls">
            <Field label="Category"><Select value={categoryId ?? "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}><SelectTrigger className="bg-card border-border"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="none">No Category</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="strategy, ai, brief" className="bg-card border-border" /></Field>
            <Field label="Collection"><Select value={collectionId ?? "none"} onValueChange={(v) => setCollectionId(v === "none" ? null : v)}><SelectTrigger className="bg-card border-border"><SelectValue placeholder="Collection" /></SelectTrigger><SelectContent><SelectItem value="none">No Collection</SelectItem>{collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Visibility"><Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{VISIBILITIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Membership Access"><Select value={requiredPlan} onValueChange={(v) => setRequiredPlan(v as typeof requiredPlan)}><SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger><SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p === "free" ? "Free" : p === "premium" ? "Premium" : p === "vip" ? "VIP" : "Beta"}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Draft / Publish"><div className="grid grid-cols-2 gap-2">{(["draft", "published"] as const).map((mode) => <button key={mode} type="button" onClick={() => setPublishMode(mode)} className={(publishMode === mode ? "bg-accent text-foreground border-foreground/30" : "bg-card/40 text-muted-foreground border-border hover:text-foreground") + " border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em]"}>{mode === "draft" ? "Draft" : "Publish"}</button>)}</div></Field>
            <Field label="Schedule"><div className="flex items-center justify-between border border-border bg-card/40 px-3 py-2"><span className="text-sm text-muted-foreground">Schedule publish time</span><Switch checked={scheduled} onCheckedChange={setScheduled} /></div>{scheduled ? <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="bg-card border-border" /> : null}</Field>
            <Field label="Operations"><Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^0-9-]/g, ""))} placeholder="Sort order" className="bg-card border-border" /><div className="flex items-center justify-between border border-border bg-card/40 px-3 py-2"><span className="text-sm text-muted-foreground">Featured</span><Switch checked={featured} onCheckedChange={setFeatured} /></div></Field>
            <Field label="Media Data"><Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="External URL" className="bg-card border-border" /><Input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} placeholder="Duration in seconds" className="bg-card border-border" /><Input value={readingMin} onChange={(e) => setReadingMin(e.target.value.replace(/\D/g, ""))} placeholder="Reading minutes" className="bg-card border-border" /></Field>
            <Button className="w-full h-12" disabled={saving} onClick={() => save(publishMode)}><CheckCircle2 className="w-4 h-4 mr-2" /> Save {publishMode === "published" ? "and Publish" : "Draft"}</Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="border border-border bg-card/25 p-5 space-y-5"><h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{title}</h3>{children}</section>; }
export function Section({ label, children }: { label: string; children: ReactNode }) { return <Field label={label}>{children}</Field>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2"><span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span><div className="space-y-2">{children}</div></label>; }
export function PreviewImage({ src }: { src?: string | null }) { return <div className="aspect-[16/9] border border-border bg-card relative overflow-hidden">{src ? <img src={src} alt="Thumbnail preview" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageIcon className="w-8 h-8" /></div>}</div>; }
export function AssetLine({ path, onRemove }: { path?: string | null; onRemove: () => void }) { return path ? <div className="border border-border bg-card p-3 flex items-center gap-3 text-xs font-mono"><FileText className="w-4 h-4" /><span className="truncate flex-1">{path.split("/").pop()}</span><button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">remove</button></div> : null; }
export function FileButton({ accept, onPick, loadingPct, label }: { accept: string; onPick: (f: File) => void; loadingPct?: number; label: string }) {
  const ref = useRef<HTMLInputElement>(null); const loading = !!loadingPct && loadingPct > 0 && loadingPct < 100;
  const pick = (f?: File | null) => { if (f && !loading) onPick(f); };
  return <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }} className="border border-dashed border-border bg-card/40 p-3"><input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} /><Button type="button" variant="outline" disabled={loading} onClick={() => ref.current?.click()} className="w-full"><Upload className="w-4 h-4 mr-2" />{loading ? `Uploading ${loadingPct}%` : label}</Button><p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Drag file here or choose file</p>{loadingPct ? <Progress value={loadingPct} className="mt-3" /> : null}{loadingPct === 100 ? <p className="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><RotateCcw className="w-3 h-3" /> syncing media registry…</p> : null}</div>;
}
