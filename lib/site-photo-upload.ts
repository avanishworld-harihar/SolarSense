import { createSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Sol.52 — server-side helper for uploading past-installation site photos
 * to Supabase Storage. Used by the proposal builder so the customer's web
 * link / PPT can show real photos with permanent public URLs.
 *
 * Mirrors `lib/company-logo-upload.ts` but lives under a different prefix
 * (`site-photos/`) so the two asset families are easy to manage separately.
 */

const BUCKET = "installer-branding";
const PREFIX = "site-photos";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
]);

const MAX_BYTES = 8 * 1024 * 1024;

function extFromMime(mime: string): string {
  const m = mime.split(";")[0]?.trim().toLowerCase() || "image/jpeg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "jpg";
}

async function ensureBucket() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY missing." };
  }
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (bucket) return { ok: true as const, admin };
  const { error: createErr } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME, "image/svg+xml"]
  });
  if (createErr && !createErr.message.toLowerCase().includes("already")) {
    return { ok: false as const, error: createErr.message };
  }
  return { ok: true as const, admin };
}

export async function uploadSitePhoto(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ ok: boolean; url?: string; path?: string; error?: string }> {
  const mime = mimeType.split(";")[0]?.trim().toLowerCase() || "image/jpeg";
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: `Unsupported file type: ${mime}` };
  }
  if (fileBuffer.length > MAX_BYTES) {
    return { ok: false, error: `Photo too large. Max size is ${Math.round(MAX_BYTES / 1024 / 1024)}MB.` };
  }

  const setup = await ensureBucket();
  if (!setup.ok) return { ok: false, error: setup.error };
  const admin = setup.admin;

  const path = `${PREFIX}/${crypto.randomUUID()}.${extFromMime(mime)}`;
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, fileBuffer, {
    upsert: false,
    contentType: mime,
    cacheControl: "3600"
  });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, error: "Could not generate public URL." };
  }
  return { ok: true, url: data.publicUrl, path };
}
