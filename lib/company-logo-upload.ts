import { createSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "installer-branding";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);

function extFromMime(mime: string): string {
  const m = mime.split(";")[0]?.trim().toLowerCase() || "image/png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/svg+xml") return "svg";
  return "png";
}

async function ensureBucket() {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY missing." };

  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (bucket) return { ok: true as const, admin };

  const { error: createErr } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [...ALLOWED_MIME]
  });
  if (createErr && !createErr.message.toLowerCase().includes("already")) {
    return { ok: false as const, error: createErr.message };
  }
  return { ok: true as const, admin };
}

export async function uploadCompanyLogo(fileBuffer: Buffer, mimeType: string): Promise<{
  ok: boolean;
  url?: string;
  path?: string;
  error?: string;
}> {
  const mime = mimeType.split(";")[0]?.trim().toLowerCase() || "image/png";
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: `Unsupported file type: ${mime}` };
  }
  if (fileBuffer.length > 5 * 1024 * 1024) {
    return { ok: false, error: "Logo too large. Max size is 5MB." };
  }

  const setup = await ensureBucket();
  if (!setup.ok) return { ok: false, error: setup.error };
  const admin = setup.admin;

  const path = `logos/${crypto.randomUUID()}.${extFromMime(mime)}`;
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, fileBuffer, {
    upsert: false,
    contentType: mime,
    cacheControl: "3600"
  });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return { ok: false, error: "Could not generate public URL." };

  return { ok: true, url: data.publicUrl, path };
}
