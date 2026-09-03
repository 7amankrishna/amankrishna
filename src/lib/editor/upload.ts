"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Image uploads for the editor.
 *
 * Files go to the public `article-images` bucket; RLS restricts writes to the
 * admin, so the bucket cannot be used as anonymous hosting. Uploads happen from
 * the browser rather than through a server action because a server action would
 * have to buffer the whole file in the request body for no benefit.
 */

export const BUCKET = "article-images";

/** 8 MB. Larger than any sensible article image, small enough to stay quick. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Raster formats only. SVG is deliberately excluded: it is an executable
 * document, and one served from a permissive origin is a script-injection
 * vector no HTML sanitiser can see.
 */
export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True when a dropped/pasted item is something we can actually upload. */
export function isUploadableImage(file: File): boolean {
  return (ACCEPTED_TYPES as readonly string[]).includes(file.type);
}

export async function uploadArticleImage(file: File): Promise<UploadResult> {
  if (!isUploadableImage(file)) {
    return {
      ok: false,
      error: "Use a PNG, JPEG, WebP, AVIF or GIF image.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That image is ${formatSize(file.size)}. The limit is ${formatSize(MAX_UPLOAD_BYTES)}.`,
    };
  }

  const extension = EXTENSIONS[file.type] ?? "bin";
  // Random name: keeps the original filename (and anything embedded in it) out
  // of a public URL, and guarantees no collisions.
  const path = `articles/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Image upload failed:", error.message);
    return {
      ok: false,
      error: "Upload failed. Check you are signed in as the admin and try again.",
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false, error: "Upload succeeded but no public URL was returned." };
  }
  return { ok: true, url: data.publicUrl };
}
