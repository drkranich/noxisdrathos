import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadToBucket, getSignedUrl } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, FileText, Image as ImageIcon, Save, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/content/$id")({
  head: () => ({ meta: [{ title: "Editor — CMS" }, { name: "robots", content: "noindex" }] }),
  component: ContentEditor,
});

type Category = { id: string; name: string; slug: string };

const TYPES = ["video", "pdf", "audio", "article"] as const;
const VISIBILITIES = ["public", "members", "premium"] as const;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ContentEditor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("article");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("members");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [publishAt, setPublishAt] = useState<string>("");
  const [scheduled, setScheduled] = useState(false);

  const [thumbPath, setThumbPath] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [storageBucket, setStorageBucket] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [readingMin, setReadingMin] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const slugDirty = useRef(false);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("sort_order").then(({ data }) => {
      setCategories((data ?? []) as Category[]);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("content")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setError(error?.message ?? "Não encontrado");
          setLoading(false);
          return;
        }
        setTitle(data.title);
        setSlug(data.slug);
        setSubtitle(data.subtitle ?? "");
        setDescription(data.description ?? "");
        setBodyMd(data.body_md ?? "");
        setType(data.type as (typeof TYPES)[number]);
        setVisibility(data.visibility as (typeof VISIBILITIES)[number]);
        setCategoryId(data.category_id);
        setTags((data.tags ?? []).join(", "));
        setFeatured(data.is_featured);
        if (data.publish_at) {
          setScheduled(true);
          setPublishAt(new Date(data.publish_at).toISOString().slice(0, 16));
        }
        setStorageBucket(data.storage_bucket);
        setStoragePath(data.storage_path);
        setExternalUrl(data.external_url ?? "");
        setDuration(data.duration_seconds ? String(data.duration_seconds) : "");
        setReadingMin(data.reading_minutes ? String(data.reading_minutes) : "");
        if (data.thumbnail_url) {
          setThumbPath(data.thumbnail_url);
          try {
            setThumbPreview(await getSignedUrl("thumbnails", data.thumbnail_url, 3600));
          } catch {/* ignore */}
        }
        setLoading(false);
        slugDirty.current = true;
      });
  }, [id, isNew]);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugDirty.current) setSlug(slugify(v));
  }

  async function onThumbnail(file: File) {
    setUploadingThumb(true);
    setError(null);
    try {
      const { path } = await uploadToBucket({ bucket: "thumbnails", file });
      setThumbPath(path);
      setThumbPreview(await getSignedUrl("thumbnails", path, 3600));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingThumb(false);
    }
  }

  async function onMedia(file: File) {
    if (type === "article") return;
    const bucket = type === "video" ? "videos" : type === "pdf" ? "pdfs" : "videos";
    setUploadingMedia(true);
    setError(null);
    try {
      const { path } = await uploadToBucket({ bucket, file });
      setStorageBucket(bucket);
      setStoragePath(path);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingMedia(false);
    }
  }

  async function save(targetStatus: "draft" | "scheduled" | "published") {
    setSaving(true);
    setError(null);

    let finalStatus: "draft" | "scheduled" | "published" = targetStatus;
    let publishTs: string | null = null;
    if (scheduled && publishAt) {
      publishTs = new Date(publishAt).toISOString();
      if (targetStatus !== "draft" && new Date(publishTs) > new Date()) finalStatus = "scheduled";
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      body_md: bodyMd || null,
      type,
      visibility,
      status: finalStatus,
      category_id: categoryId,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_featured: featured,
      publish_at: publishTs,
      thumbnail_url: thumbPath,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      external_url: externalUrl.trim() || null,
      duration_seconds: duration ? Number(duration) : null,
      reading_minutes: readingMin ? Number(readingMin) : null,
      created_by: user?.id ?? null,
    };

    if (!payload.title) {
      setError("O título é obrigatório.");
      setSaving(false);
      return;
    }

    const { data, error } = isNew
      ? await supabase.from("content").insert(payload).select("id").single()
      : await supabase.from("content").update(payload).eq("id", id).select("id").single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (isNew && data?.id) nav({ to: "/app/admin/content/$id", params: { id: data.id }, replace: true });
  }

  if (loading) {
    return (
      <div className="px-8 lg:px-14 py-12 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        carregando…
      </div>
    );
  }

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/app/admin/content"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> conteúdos
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" disabled={saving} onClick={() => save("draft")}>
            <Save className="w-4 h-4 mr-2" /> salvar rascunho
          </Button>
          <Button disabled={saving} onClick={() => save("published")}>
            <Eye className="w-4 h-4 mr-2" /> {scheduled ? "agendar" : "publicar"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-[11px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-6">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Título do conteúdo"
            className="font-display text-3xl h-auto py-3 bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
          />
          <Input
            value={slug}
            onChange={(e) => { slugDirty.current = true; setSlug(slugify(e.target.value)); }}
            placeholder="slug-amigavel"
            className="font-mono text-xs bg-card border-border"
          />
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtítulo (opcional)"
            className="bg-card border-border"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição curta para listas e prévias…"
            rows={3}
            className="bg-card border-border resize-none"
          />

          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">escrever</TabsTrigger>
              <TabsTrigger value="preview">prévia</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                rows={20}
                placeholder={"# Cabeçalho\n\nEscreva em markdown.\n\n- listas\n- **negrito**\n- _itálico_\n- [links](https://)"}
                className="bg-card border-border font-mono text-sm resize-y min-h-[400px]"
              />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                markdown · suporte completo na renderização do membro
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <article className="border border-border bg-card p-6 prose prose-invert max-w-none whitespace-pre-wrap font-mono text-sm">
                {bodyMd || <span className="text-muted-foreground">Nada para visualizar.</span>}
              </article>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Section label="thumbnail">
            <div className="aspect-[16/10] border border-border bg-card relative overflow-hidden">
              {thumbPreview ? (
                <img src={thumbPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
            <FileButton
              accept="image/*"
              onPick={onThumbnail}
              loading={uploadingThumb}
              label={thumbPath ? "trocar imagem" : "enviar imagem"}
            />
          </Section>

          <Section label="tipo">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>

          {type !== "article" ? (
            <Section label={type === "pdf" ? "arquivo pdf (privado)" : type === "video" ? "vídeo (privado)" : "áudio (privado)"}>
              {storagePath ? (
                <div className="border border-border bg-card p-3 flex items-center gap-3 text-xs font-mono">
                  <FileText className="w-4 h-4" />
                  <span className="truncate flex-1">{storagePath.split("/").pop()}</span>
                  <button onClick={() => { setStoragePath(null); setStorageBucket(null); }} className="text-muted-foreground hover:text-destructive">remover</button>
                </div>
              ) : null}
              <FileButton
                accept={type === "pdf" ? "application/pdf" : type === "video" ? "video/*" : "audio/*"}
                onPick={onMedia}
                loading={uploadingMedia}
                label={storagePath ? "substituir arquivo" : "enviar arquivo"}
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                bucket privado · acesso por url assinada
              </p>
            </Section>
          ) : null}

          <Section label="url externa (opcional)">
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
              className="bg-card border-border"
            />
          </Section>

          <Section label="visibilidade">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">pública (prévia aberta)</SelectItem>
                <SelectItem value="members">membros</SelectItem>
                <SelectItem value="premium">premium</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          <Section label="categoria">
            <Select value={categoryId ?? "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">sem categoria</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>

          <Section label="tags (separadas por vírgula)">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ia, automação, ativos…"
              className="bg-card border-border"
            />
          </Section>

          <Section label="agendamento">
            <div className="flex items-center justify-between">
              <span className="text-sm">agendar publicação</span>
              <Switch checked={scheduled} onCheckedChange={setScheduled} />
            </div>
            {scheduled ? (
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="bg-card border-border"
              />
            ) : null}
          </Section>

          <Section label="destaque">
            <div className="flex items-center justify-between">
              <span className="text-sm">marcar como destaque</span>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
          </Section>

          {type === "video" || type === "audio" ? (
            <Section label="duração (segundos)">
              <Input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} className="bg-card border-border" />
            </Section>
          ) : null}
          {type === "article" || type === "pdf" ? (
            <Section label="leitura (minutos)">
              <Input value={readingMin} onChange={(e) => setReadingMin(e.target.value.replace(/\D/g, ""))} className="bg-card border-border" />
            </Section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FileButton({
  accept,
  onPick,
  loading,
  label,
}: {
  accept: string;
  onPick: (f: File) => void;
  loading?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => ref.current?.click()}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {loading ? "enviando…" : label}
      </Button>
    </>
  );
}
