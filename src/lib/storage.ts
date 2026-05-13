import { supabase } from "@/integrations/supabase/client";

export type UploadOpts = {
  bucket: "videos" | "pdfs" | "thumbnails" | "audios";
  file: File;
  pathPrefix?: string;
  onProgress?: (pct: number) => void;
};

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadToBucket({ bucket, file, pathPrefix }: UploadOpts) {
  const ts = Date.now();
  const safe = slugifyName(file.name);
  const path = `${pathPrefix ? pathPrefix.replace(/^\/|\/$/g, "") + "/" : ""}${ts}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { bucket, path };
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function getPublicThumbnailUrl(path: string) {
  // thumbnails bucket is private but readable by authenticated users via signed URL
  return getSignedUrl("thumbnails", path, 60 * 60 * 24);
}

export async function deleteFromBucket(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
