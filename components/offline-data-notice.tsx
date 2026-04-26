"use client";

import { WifiOff } from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import { formatCacheAgeLocale } from "@/lib/time-i18n";
import { cn } from "@/lib/utils";

type OfflineDataNoticeProps = {
  /** When true, network is unavailable and the UI is showing cached data */
  show: boolean;
  className?: string;
  /** Label for the surface (e.g. "dashboard stats" / "lead list") */
  label?: string;
  /** Age in ms since last successful network sync (from persist helpers); null if unknown */
  cacheAgeMs?: number | null;
};

export function OfflineDataNotice({ show, className, label = "data", cacheAgeMs = null }: OfflineDataNoticeProps) {
  const { locale, t } = useLanguage();
  if (!show) return null;

  const agePhrase = formatCacheAgeLocale(locale, cacheAgeMs);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm backdrop-blur-sm sm:text-sm",
        className
      )}
      role="status"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <span>{t("offline_dataNotice", { label, age: agePhrase })}</span>
    </div>
  );
}
