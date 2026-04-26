"use client";

import { AppShell } from "@/components/app-shell";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function AdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = searchParams.get("reason");
  const next = searchParams.get("next") || "/admin/tariff-reports";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() || null, phone: phone.trim() || null })
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Login failed");
      router.replace(next);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Admin Login">
      <div className="mx-auto w-full max-w-md ss-page-backdrop">
        <div className="ss-card p-5">
        <h2 className="ss-section-headline text-lg">Admin Access</h2>
        <p className="ss-section-subline text-sm">Sign in using admin user ID or admin phone. Access is granted only if your Supabase user role is admin.</p>
        {reason === "not_configured" ? (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            Admin access is not configured on server. Add `SUPABASE_SERVICE_ROLE_KEY` in env and restart.
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <FloatingLabelInput
            label="Admin user ID (optional)"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoFocus
          />
          <FloatingLabelInput
            label="Admin phone (optional)"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || (userId.trim().length === 0 && phone.trim().length === 0)}
            className="ss-cta-primary w-full"
          >
            {busy ? "Signing in..." : "Sign in as Admin"}
          </button>
        </form>
      </div>
      </div>
    </AppShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Admin Login">
          <p className="p-4 text-sm font-semibold text-muted-foreground">Loading…</p>
        </AppShell>
      }
    >
      <AdminLoginPageContent />
    </Suspense>
  );
}
