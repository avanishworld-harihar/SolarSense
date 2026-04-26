"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { BottomNav } from "@/components/bottom-nav";
import { useLanguage } from "@/lib/language-context";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <>
      <AppShell title={t("notFound_title")}>
        <div className="glass-surface mx-auto flex max-w-md flex-col items-center gap-4 border-white/55 px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">{t("notFound_title")}</h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t("notFound_sub")}</p>
          <Link
            href="/"
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-700"
          >
            {t("notFound_back")}
          </Link>
        </div>
      </AppShell>
      <BottomNav />
    </>
  );
}
