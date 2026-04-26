"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, IndianRupee, MapPin, MessageCircle, PhoneCall, Users } from "lucide-react";

import type { CustomerLead } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_BADGE,
  LEAD_STATUS_I18N_KEY,
  normalizeLeadStatus,
  type LeadStatusKey
} from "@/lib/lead-status";
import { getInstallerBrandName } from "@/lib/installer-brand";
import { useLanguage } from "@/lib/language-context";
import { formatLastFollowUpLocale } from "@/lib/time-i18n";
import { buildLeadWhatsAppUrl } from "@/lib/whatsapp-lead";
import { readLeadFollowUpMap, recordLeadFollowUp } from "@/lib/lead-followup-storage";

export type { CustomerLead };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function LeadStatusBadge({ statusKey, label }: { statusKey: LeadStatusKey; label: string }) {
  const meta = LEAD_STATUS_BADGE[statusKey];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center rounded-full border-[0.5px] px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm sm:text-xs",
        meta.className
      )}
    >
      <span className="leading-tight">{label}</span>
    </span>
  );
}

function LeadRowSkeleton() {
  return (
    <div className="rounded-2xl border-[0.5px] border-white/50 bg-white/30 p-4 shadow-[0_12px_36px_rgba(11,34,64,0.08)] md:grid md:grid-cols-12 md:items-center md:gap-4 md:p-4">
      <div className="flex items-center gap-3 md:col-span-5">
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl bg-slate-200/80" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded-md bg-slate-200/80" />
          <Skeleton className="h-3 w-24 rounded-md bg-slate-200/60" />
        </div>
      </div>
      <Skeleton className="mt-3 hidden h-10 rounded-lg bg-slate-200/60 md:col-span-3 md:mt-0 md:block" />
      <Skeleton className="mt-2 hidden h-8 w-20 rounded-lg bg-slate-200/60 md:col-span-2 md:mt-0 md:block" />
      <div className="mt-3 flex justify-start md:col-span-2 md:mt-0 md:justify-end">
        <Skeleton className="h-7 w-28 rounded-full bg-slate-200/70" />
      </div>
    </div>
  );
}

export function CustomersLeadList({ customers, loading }: { customers: CustomerLead[]; loading: boolean }) {
  const { locale, t } = useLanguage();
  const showHeader = !loading && customers.length > 0;
  const installerName = getInstallerBrandName();
  const [followMap, setFollowMap] = useState<Record<string, number>>({});

  const refreshFollowMap = useCallback(() => {
    setFollowMap({ ...readLeadFollowUpMap() });
  }, []);

  useEffect(() => {
    refreshFollowMap();
  }, [customers, refreshFollowMap]);

  const openWhatsApp = useCallback(
    (leadId: string, url: string) => {
      recordLeadFollowUp(leadId);
      refreshFollowMap();
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [refreshFollowMap]
  );

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="hidden rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-12 md:gap-4 md:px-5">
          <div className="col-span-5 pl-14">{t("customers_tableLead")}</div>
          <div className="col-span-3">{t("customers_tableLocation")}</div>
          <div className="col-span-2">{t("customers_tableBill")}</div>
          <div className="col-span-2 text-right">{t("customers_tablePipeline")}</div>
        </div>
      )}

      <div className="space-y-3 md:space-y-2">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <LeadRowSkeleton key={i} />
          ))}

        {!loading && customers.length === 0 && <CustomersLeadListEmpty t={t} />}

        {!loading &&
          customers.map((customer) => {
            const statusKey = normalizeLeadStatus(customer.status);
            const bill = Number(customer.monthly_bill || 0);
            const ts = followMap[customer.id];
            const followLabel = ts != null ? formatLastFollowUpLocale(locale, ts) : t("customers_neverFollowedUp");
            const waUrl = customer.phone ? buildLeadWhatsAppUrl(customer.phone, customer.name, installerName, locale) : null;
            const statusLabel = t(LEAD_STATUS_I18N_KEY[statusKey]);

            return (
              <article
                key={customer.id}
                className={cn(
                  "group ss-card relative overflow-hidden p-4",
                  "backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,transform] duration-200",
                  "hover:border-white/75 hover:shadow-[0_16px_48px_rgba(11,34,64,0.12)] active:scale-[0.998] md:grid md:grid-cols-12 md:items-center md:gap-4 md:p-4 md:px-5"
                )}
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-400/10 to-solar-400/10 blur-2xl"
                  aria-hidden
                />

                <div className="relative flex items-start gap-3 md:col-span-5 md:items-center md:gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-sm font-extrabold text-white shadow-md shadow-brand-900/20 ring-2 ring-white/60 sm:h-14 sm:w-14 sm:text-base"
                    aria-hidden
                  >
                    {initials(customer.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-extrabold tracking-tight text-brand-900 sm:text-lg">{customer.name}</h3>
                    {customer.phone ? (
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm">
                        <p className="flex min-w-0 items-center gap-1.5">
                          <PhoneCall className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.85} aria-hidden />
                          <span className="tabular-nums">{customer.phone}</span>
                        </p>
                        {waUrl ? (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(customer.id, waUrl)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-emerald-200/80 bg-emerald-50/90 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                            aria-label={t("customers_whatsappAria")}
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs font-medium text-slate-400 sm:text-sm">{t("customers_noPhoneOnFile")}</p>
                    )}
                    <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500 sm:text-[11px]">
                      <span className="text-slate-400">{t("customers_lastFollowUpLabel")}: </span>
                      {followLabel}
                    </p>
                  </div>
                  <div className="shrink-0 md:hidden">
                    <LeadStatusBadge statusKey={statusKey} label={statusLabel} />
                  </div>
                </div>

                <div className="relative mt-4 flex flex-col gap-1 border-t border-white/45 pt-3 md:col-span-3 md:mt-0 md:border-t-0 md:border-none md:pt-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span className="truncate">{customer.city}</span>
                  </p>
                  <p className="flex items-center gap-2 pl-6 text-xs font-medium text-slate-600 sm:text-sm">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="truncate">{customer.discom}</span>
                  </p>
                </div>

                <div className="relative mt-3 flex items-center gap-2 md:col-span-2 md:mt-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border-[0.5px] border-white/50 bg-white/60 text-solar-600 shadow-inner md:h-10 md:w-10">
                    <IndianRupee className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("customers_monthlyBillShort")}</p>
                    <p className="text-base font-extrabold tabular-nums text-brand-800 sm:text-lg">₹{bill.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="relative mt-4 hidden justify-end md:col-span-2 md:mt-0 md:flex">
                  <LeadStatusBadge statusKey={statusKey} label={statusLabel} />
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}

export function CustomersLeadListEmpty({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[0.5px] border-dashed border-brand-200/80 bg-gradient-to-b from-white/50 to-indigo-50/30 px-6 py-14 text-center shadow-[0_12px_36px_rgba(11,34,64,0.08)] backdrop-blur-sm">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-[0.5px] border-white/60 bg-white/80 text-brand-600 shadow-inner ring-1 ring-brand-100">
        <Users className="h-8 w-8" strokeWidth={2} aria-hidden />
      </span>
      <p className="mt-4 text-base font-extrabold text-brand-900">{t("customers_emptyList")}</p>
      <p className="mt-1 max-w-sm text-sm font-medium leading-relaxed text-slate-600">{t("customers_emptySub")}</p>
    </div>
  );
}
