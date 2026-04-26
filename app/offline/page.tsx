"use client";

import Link from "next/link";

import { useLanguage } from "@/lib/language-context";

/** Shown when the PWA shell is open without network (service worker fallback). */
export default function OfflinePage() {
  const { t } = useLanguage();
  return (
    <div className="mesh-gradient-bg flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="ss-page-backdrop w-full max-w-lg">
        <div className="ss-card space-y-3 p-6">
          <p className="ss-section-headline font-display text-xl">{t("offline_page_title")}</p>
          <p className="mx-auto max-w-sm text-sm font-semibold leading-relaxed text-slate-600">{t("offline_page_body")}</p>
          <div className="pt-1">
            <Link href="/" className="ss-cta-primary px-6 py-3">
              {t("notFound_back")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
