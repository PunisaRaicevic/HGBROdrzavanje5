import { supabase } from './supabase';
import { randomUUID } from 'crypto';

const BUCKET = 'task-images';
let bucketEnsured = false;

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
      if (error && !error.message.includes('already exists')) {
        console.error('[imageStorage] Failed to create bucket:', error);
        throw error;
      }
      console.log(`[imageStorage] Created bucket "${BUCKET}"`);
    }
    bucketEnsured = true;
  } catch (err) {
    console.error('[imageStorage] ensureBucket error:', err);
    throw err;
  }
}

function detectMimeAndExt(dataUrl: string): { mime: string; ext: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp|gif));base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  let ext = match[2].toLowerCase();
  if (ext === 'jpg') ext = 'jpeg';
  return { mime, ext, base64: match[3] };
}

export function isStorageUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

export function isBase64Image(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:image/');
}

export async function uploadBase64Image(
  base64DataUrl: string,
  folder: string,
): Promise<string> {
  await ensureBucket();
  const parsed = detectMimeAndExt(base64DataUrl);
  if (!parsed) throw new Error('Invalid base64 image data URL');

  const buffer = Buffer.from(parsed.base64, 'base64');
  const path = `${folder}/${randomUUID()}.${parsed.ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: parsed.mime,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadIfBase64(
  value: string,
  folder: string,
): Promise<string> {
  if (!value) return value;
  if (isStorageUrl(value)) return value;
  if (!isBase64Image(value)) return value;
  try {
    return await uploadBase64Image(value, folder);
  } catch (err) {
    console.error('[imageStorage] Upload failed, keeping base64 fallback:', err);
    return value;
  }
}

export async function uploadImagesArray(
  images: string[] | null | undefined,
  folder: string,
): Promise<string[] | null> {
  if (!images || images.length === 0) return images ?? null;
  const results = await Promise.all(images.map((img) => uploadIfBase64(img, folder)));
  return results;
}

/**
 * Extract the storage path (e.g. "reporter/uuid.jpeg") from a public Supabase URL.
 * Returns null if the URL doesn't belong to our bucket.
 */
export function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/**
 * Delete a list of image URLs from Supabase Storage.
 * Silently ignores non-storage URLs and base64 strings. Logs but does not throw.
 */
export async function deleteImagesFromStorage(
  urls: (string | null | undefined)[],
): Promise<void> {
  const paths = urls
    .map((u) => (u ? extractStoragePath(u) : null))
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      console.error('[imageStorage] deleteImagesFromStorage error:', error);
    } else {
      console.log(`[imageStorage] Deleted ${paths.length} image(s) from storage`);
    }
  } catch (err) {
    console.error('[imageStorage] deleteImagesFromStorage threw:', err);
  }
}

export async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch (err) {
    console.error('[imageStorage] fetchImageAsBuffer error:', err);
    return null;
  }
}
