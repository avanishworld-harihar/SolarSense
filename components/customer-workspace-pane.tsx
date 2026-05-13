"use client";

import Link from "next/link";
import { Building2, IndianRupee, MapPin, MessageCircle, Phone, PhoneCall } from "lucide-react";

import {
  LeadStatusBadge,
  LeadStatusPillSelect,
  formatLeadLastActivity
} from "@/components/customers-lead-list";
import type { CustomerLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_I18N_KEY, normalizeLeadStatus, type LeadStatusKey } from "@/lib/lead-status";
import { getInstallerBrandName } from "@/lib/installer-brand";
import { useLanguage } from "@/lib/language-context";
import { formatLastFollowUpLocale } from "@/lib/time-i18n";
import { buildLeadWhatsAppUrl } from "@/lib/whatsapp-lead";
import { readLeadFollowUpMap, recordLeadFollowUp } from "@/lib/lead-followup-storage";
import { isLeadStale } from "@/lib/lead-source";
import { resolveCustomerCommercialCta } from "@/lib/customer-crm-cta";
import { useCallback, useEffect, useState } from "react";

type CustomerStage = "lead" | "in-pipeline" | "active-project";

const CUSTOMER_STAGE_META: Record<CustomerStage, { labelKey: string; className: string }> = {
  lead: {
    labelKey: "customers_stageLead",
    className: "border-slate-200/90 bg-slate-50/90 text-slate-700"
  },
  "in-pipeline": {
    labelKey: "customers_stageInPipeline",
    className: "border-amber-200/90 bg-amber-50/90 text-amber-800"
  },
  "active-project": {
    labelKey: "customers_stageActiveProject",
    className: "border-emerald-200/90 bg-emerald-50/90 text-emerald-800"
  }
};

export function CustomerWorkspacePane({
  customer,
  onStatusChange
}: {
  customer: CustomerLead | null;
  onStatusChange?: (leadId: string, next: LeadStatusKey) => void;
}) {
  const { locale, t } = useLanguage();
  const installerName = getInstallerBrandName();
  const [followMap, setFollowMap] = useState<Record<string, number>>({});

  const refreshFollowMap = useCallback(() => {
    setFollowMap({ ...readLeadFollowUpMap() });
  }, []);

  useEffect(() => {
    refreshFollowMap();
  }, [customer, refreshFollowMap]);

  const openWhatsApp = useCallback(
    (leadId: string, url: string) => {
      recordLeadFollowUp(leadId);
      refreshFollowMap();
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [refreshFollowMap]
  );

  const handlePhoneCall = useCallback(
    (leadId: string) => {
      recordLeadFollowUp(leadId);
      refreshFollowMap();
    },
    [refreshFollowMap]
  );

  if (!customer) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 p-6 text-center dark:border-white/15 dark:bg-white/[0.03]">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("customers_workspaceEmptyTitle")}</p>
        <p className="mt-2 max-w-[16rem] text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {t("customers_workspaceEmptySub")}
        </p>
      </div>
    );
  }

  const statusKey = normalizeLeadStatus(customer.status);
  const bill = Number(customer.monthly_bill || 0);
  const ts = followMap[customer.id];
  const followLabel = ts != null ? formatLastFollowUpLocale(locale, ts) : t("customers_neverFollowedUp");
  const waUrl = customer.phone ? buildLeadWhatsAppUrl(customer.phone, customer.name, installerName, locale) : null;
  const statusLabel = t(LEAD_STATUS_I18N_KEY[statusKey]);
  const stale = isLeadStale(customer.last_touched_at);
  const stage = (customer.customer_stage ?? "lead") as CustomerStage;
  const stageMeta = CUSTOMER_STAGE_META[stage];
  const commercialCta = resolveCustomerCommercialCta(customer);
  const lastActivityLabel = formatLeadLastActivity(customer.last_touched_at, locale);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/40 dark:border-white/10 dark:bg-[#0c1017] dark:ring-white/[0.06]">
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0c1017]/95">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("customers_workspaceTitle")}</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">{customer.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              stageMeta.className
            )}
          >
            {t(stageMeta.labelKey)}
          </span>
          {onStatusChange ? (
            <LeadStatusPillSelect
              leadId={customer.id}
              statusKey={statusKey}
              label={statusLabel}
              t={t}
              onChange={onStatusChange}
            />
          ) : (
            <LeadStatusBadge statusKey={statusKey} label={statusLabel} />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {customer.phone ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <PhoneCall className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.85} aria-hidden />
            <span className="tabular-nums">{customer.phone}</span>
          </p>
        ) : (
          <p className="text-sm font-medium text-slate-400">{t("customers_noPhoneOnFile")}</p>
        )}

        <div className="space-y-2 rounded-xl bg-slate-50/90 p-3 text-sm dark:bg-white/[0.05]">
          <p className="flex items-start gap-2 font-semibold text-slate-800 dark:text-slate-100">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span>
              <span className="block">{customer.city}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {customer.discom}
              </span>
            </span>
          </p>
          <p className="flex items-center gap-2 border-t border-slate-200/80 pt-2 dark:border-white/10">
            <IndianRupee className="h-4 w-4 text-slate-500" strokeWidth={2.5} aria-hidden />
            <span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("customers_monthlyBillShort")}</span>
              <span className="ml-2 text-base font-black tabular-nums text-slate-900 dark:text-slate-50">₹{bill.toLocaleString("en-IN")}</span>
            </span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-500">{t("customers_mobileLastActivity")}: </span>
            {lastActivityLabel}
            {stale ? <span className="ml-2 font-bold text-amber-600"> · {t("customers_staleHintShort")}</span> : null}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-500">{t("customers_lastFollowUpLabel")}: </span>
            {followLabel}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              onClick={() => handlePhoneCall(customer.id)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white shadow-sm active:bg-indigo-700"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {t("customers_mobileCall")}
            </a>
          ) : null}
          {waUrl ? (
            <button
              type="button"
              onClick={() => openWhatsApp(customer.id, waUrl)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 active:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("customers_whatsappShort")}
            </button>
          ) : null}
          <Link
            href={commercialCta.href}
            className="ss-cta-primary min-h-11 w-full text-center text-sm"
          >
            {t(commercialCta.labelKey)}
          </Link>
        </div>
      </div>
    </div>
  );
}
