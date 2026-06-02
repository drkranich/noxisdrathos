import { supabase } from "@/integrations/supabase/client";

export type PublishingBucket = "videos" | "pdfs" | "audio" | "section-thumbnails" | "content-banners" | "attachments";

export type UploadOpts = {
  bucket: PublishingBucket;
  file: File;
  pathPrefix?: string;
  onProgress?: (pct: number) => void;
};

type Rule = { maxBytes: number; accept: RegExp; label: string };

const MB = 1024 * 1024;

export const BUCKET_RULES: Record<PublishingBucket, Rule> = {
  videos: { maxBytes: 1024 * MB, accept: /^video\//, label: "vídeo" },
  pdfs: { maxBytes: 80 * MB, accept: /^application\/pdf$/, label: "PDF" },
  audio: { maxBytes: 250 * MB, accept: /^audio\//, label: "áudio" },
  "section-thumbnails": { maxBytes: 15 * MB, accept: /^image\//, label: "thumbnail" },
  "content-banners": { maxBytes: 25 * MB, accept: /^image\//, label: "banner" },
  attachments: { maxBytes: 120 * MB, accept: /^(application\/pdf|image\/|text\/|application\/zip|application\/json)/, label: "anexo" },
};

export function slugifyName(name: string) {
  const safe = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "arquivo";
}

export function validateFile(bucket: PublishingBucket, file: File) {
  const rule = BUCKET_RULES[bucket];
  if (!rule.accept.test(file.type || "")) {
    throw new Error(`Formato inválido para ${rule.label}.`);
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`${rule.label} excede ${Math.round(rule.maxBytes / MB)}MB.`);
  }
}

function objectUrl(bucket: PublishingBucket, path: string) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("Backend indisponível para upload.");
  return `${base.replace(/\/$/, "")}/storage/v1/object/${bucket}/${encodeURI(path).replace(/#/g, "%23")}`;
}

export async function uploadToBucket({ bucket, file, pathPrefix, onProgress }: UploadOpts) {
  validateFile(bucket, file);

  const ts = Date.now();
  const safe = slugifyName(file.name);
  const prefix = pathPrefix ? pathPrefix.replace(/^\/|\/$/g, "") : "admin";
  const path = `${prefix}/${ts}-${safe}`;

  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.token) {
    throw new Error(signed.error?.message || "Não foi possível preparar o upload assinado.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${objectUrl(bucket, path).replace("/object/", "/object/upload/sign/")}?token=${encodeURIComponent(signed.data.token)}`);
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let message = `Upload falhou (${xhr.status}).`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = parsed.message || parsed.error || message;
        } catch {
          if (xhr.responseText) message = xhr.responseText;
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));
    xhr.send(body);
  });

  return { bucket, path, fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size };
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 60 * 60) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFromBucket(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
