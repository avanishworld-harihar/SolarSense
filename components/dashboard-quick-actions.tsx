"use client";

import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { FileText, FolderPlus, Upload, UserPlus } from "lucide-react";
import Link from "next/link";

export function DashboardQuickActions({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-4 lg:gap-3",
        className
      )}
    >
      <Link
        href="/customers?add=1"
        className="glass-quick-action glass-quick-action--featured group min-[520px]:col-span-2 lg:col-span-1"
      >
        <span className="ws-icon-well ws-icon-well--sky mb-3 h-10 w-10 rounded-xl" aria-hidden>
          <UserPlus className="h-5 w-5 transition-transform duration-300 group-hover:scale-105" strokeWidth={2.25} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-brand-900 dark:text-white lg:text-base">{t("dashboard_addCustomerCta")}</span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-[#8B949E] lg:text-sm">{t("dashboard_addCustomerSub")}</span>
      </Link>

      <Link href="/proposal" className="glass-quick-action glass-quick-action--featured group min-[520px]:col-span-2 lg:col-span-1">
        <span className="ws-icon-well ws-icon-well--emerald mb-3 h-10 w-10 rounded-xl" aria-hidden>
          <FileText className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.25} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-brand-900 dark:text-white lg:text-base">{t("actions_newProposal")}</span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-[#8B949E] lg:text-sm">{t("dashboard_newProposalSub")}</span>
      </Link>

      <Link href="/proposal" className="glass-quick-action-compact min-h-[5.5rem] min-[520px]:min-h-11 lg:min-h-[5.5rem]">
        <Upload className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="text-left">{t("actions_uploadBill")}</span>
      </Link>

      <Link href="/projects" className="glass-quick-action-compact min-h-[5.5rem] min-[520px]:min-h-11 lg:min-h-[5.5rem]">
        <FolderPlus className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="text-left">{t("actions_createProject")}</span>
      </Link>
    </div>
  );
}
