import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const ADMIN_COOKIE_NAME = "ss_admin_access";
const DEFAULT_SESSION_HOURS = 8;
const ADMIN_ROLES = new Set(["admin", "owner", "super_admin", "superadmin"]);

export type AdminSessionPayload = {
  identifier: string;
  checkedAt: string;
};

export type AdminIdentityInput = {
  userId?: string | null;
  phone?: string | null;
};

export type AdminResolvedUser = {
  id: string;
  role: string | null;
  phone: string | null;
  name: string | null;
  source: "supabase_users" | "env_allowlist";
};

function cleanPhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function normalize(value?: string | null): string {
  return (value ?? "").trim();
}

function getEnvAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((v) => normalize(v))
    .filter(Boolean);
}

function getEnvAdminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((v) => cleanPhone(normalize(v)))
    .filter(Boolean);
}

function parseAdminCookie(raw?: string | null): AdminSessionPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<AdminSessionPayload>;
    if (!obj.identifier || typeof obj.identifier !== "string") return null;
    return { identifier: obj.identifier, checkedAt: typeof obj.checkedAt === "string" ? obj.checkedAt : new Date().toISOString() };
  } catch {
    return null;
  }
}

function isAdminRow(row: Record<string, unknown>): boolean {
  if (row.is_admin === true) return true;
  const role = normalize(String(row.role ?? row.user_role ?? row.access_role ?? "")).toLowerCase();
  return ADMIN_ROLES.has(role);
}

function mapUserRow(row: Record<string, unknown>): AdminResolvedUser {
  return {
    id: normalize(String(row.id ?? row.user_id ?? "")),
    role: normalize(String(row.role ?? row.user_role ?? row.access_role ?? "")) || null,
    phone: normalize(String(row.phone ?? row.phone_number ?? row.mobile ?? row.whatsapp ?? "")) || null,
    name: normalize(String(row.name ?? row.full_name ?? row.installer_name ?? "")) || null,
    source: "supabase_users"
  };
}

export function isAdminEnabled(): boolean {
  return Boolean(createSupabaseAdmin());
}

export function readAdminSession(req: NextRequest): AdminSessionPayload | null {
  const raw = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return parseAdminCookie(raw);
}

export async function resolveAdminIdentity(input: AdminIdentityInput): Promise<AdminResolvedUser | null> {
  const userId = normalize(input.userId);
  const phone = cleanPhone(normalize(input.phone));
  if (!userId && !phone) return null;

  const envIds = getEnvAdminIds();
  const envPhones = getEnvAdminPhones();
  if ((userId && envIds.includes(userId)) || (phone && envPhones.includes(phone))) {
    return {
      id: userId || "env-admin",
      role: "admin",
      phone: phone || null,
      name: "Admin",
      source: "env_allowlist"
    };
  }

  const admin = createSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.from("users").select("*").limit(500);
  if (error || !data?.length) return null;

  const rows = data as Record<string, unknown>[];
  const hit = rows.find((row) => {
    const rid = normalize(String(row.id ?? row.user_id ?? ""));
    const rphone = cleanPhone(normalize(String(row.phone ?? row.phone_number ?? row.mobile ?? row.whatsapp ?? "")));
    const idMatches = userId && rid === userId;
    const phoneMatches = phone && rphone && rphone === phone;
    return Boolean((idMatches || phoneMatches) && isAdminRow(row));
  });
  return hit ? mapUserRow(hit) : null;
}

export async function isAdminRequestAllowed(req: NextRequest): Promise<boolean> {
  const session = readAdminSession(req);
  if (!session) return false;
  const isPhoneLike = /^[+\d]{8,}$/.test(session.identifier);
  const resolved = await resolveAdminIdentity({
    userId: isPhoneLike ? undefined : session.identifier,
    phone: isPhoneLike ? session.identifier : undefined
  });
  return Boolean(resolved);
}

export function buildAdminCookieValue(payload: AdminSessionPayload): string {
  return JSON.stringify(payload);
}

export function adminCookieConfig() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * DEFAULT_SESSION_HOURS
  };
}
