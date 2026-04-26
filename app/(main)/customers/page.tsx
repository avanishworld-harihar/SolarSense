"use client";

import { CustomersLeadList } from "@/components/customers-lead-list";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { useToast } from "@/components/ui/toast-center";
import {
  CUSTOMERS_SWR_KEY,
  fetchCustomers,
  getCustomersCacheAgeMs,
  readCustomersCache,
  touchCustomersSavedAt,
  writeCustomersCache
} from "@/lib/customers-client";
import {
  DASHBOARD_STATS_SWR_KEY,
  type DashboardStatsPayload
} from "@/lib/dashboard-stats-client";
import { OfflineDataNotice } from "@/components/offline-data-notice";
import { useInstallerDiscoms } from "@/hooks/use-installer-discoms";
import { LEAD_STATUS_I18N_KEY, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import { INDIAN_STATES_AND_UTS } from "@/lib/indian-states-uts";
import {
  INSTALLER_REGION_EVENT,
  mergeSavedDiscomOption,
  readInstallerRegion,
  resolveDiscomCode,
  writeInstallerRegion
} from "@/lib/installer-region-storage";
import { useLanguage } from "@/lib/language-context";
import type { CustomerLead } from "@/lib/types";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { FormEvent } from "react";
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";

function CustomersPageContent() {
  const { t } = useLanguage();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { mutate: mutateGlobal } = useSWRConfig();
  const openFromQuery = searchParams.get("add") === "1";
  const [showAddModal, setShowAddModal] = useState(openFromQuery);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
    discom: "",
    monthly_bill: "",
    status: "new",
    phone: ""
  });
  const { options: leadDiscomOptions, loading: leadDiscomListLoading } = useInstallerDiscoms(form.state);
  const leadDiscomSelectOptions = useMemo(
    () => mergeSavedDiscomOption(form.discom, leadDiscomOptions),
    [form.discom, leadDiscomOptions]
  );
  const modalFloatingClass =
    "h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-teal-200/70";

  const { data, error: loadError, isLoading, mutate } = useSWR<CustomerLead[]>(CUSTOMERS_SWR_KEY, fetchCustomers, {
    dedupingInterval: 25_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    onSuccess: (list) => writeCustomersCache(list)
  });

  const customers = data ?? [];
  const showListSkeleton = isLoading && data === undefined && !loadError;

  useLayoutEffect(() => {
    const boot = readCustomersCache();
    if (boot !== undefined) void mutate(boot, { revalidate: false });
  }, [mutate]);

  useEffect(() => {
    setShowAddModal(openFromQuery);
  }, [openFromQuery]);

  useEffect(() => {
    const { state, discom } = readInstallerRegion();
    setForm((p) => ({
      ...p,
      state: state || p.state,
      discom: discom || p.discom
    }));
  }, []);

  useEffect(() => {
    const sync = () => {
      const { state, discom } = readInstallerRegion();
      setForm((p) => {
        const ns = state?.trim() ? state.trim() : p.state;
        const nd = discom?.trim() ? discom.trim() : p.discom;
        if (ns === p.state && nd === p.discom) return p;
        return { ...p, state: ns, discom: nd };
      });
    };
    window.addEventListener(INSTALLER_REGION_EVENT, sync);
    return () => window.removeEventListener(INSTALLER_REGION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!showAddModal) return;
    const { state, discom } = readInstallerRegion();
    setForm((p) => ({
      ...p,
      state: state || p.state,
      discom: discom || p.discom
    }));
  }, [showAddModal]);

  useEffect(() => {
    if (!form.state.trim()) return;
    if (leadDiscomOptions.length === 0) return;
    setForm((p) => {
      const next = resolveDiscomCode(p.discom.trim(), leadDiscomOptions);
      return next === p.discom ? p : { ...p, discom: next };
    });
  }, [form.state, leadDiscomOptions]);

  useEffect(() => {
    if (!showAddModal) return;
    const s = form.state.trim();
    const d = form.discom.trim();
    if (!s || !d) return;
    writeInstallerRegion(s, d);
  }, [showAddModal, form.state, form.discom]);

  function bumpDashboardLeads(delta: number) {
    void mutateGlobal(
      DASHBOARD_STATS_SWR_KEY,
      (prev?: DashboardStatsPayload) => {
        const base: DashboardStatsPayload = prev ?? {
          totalLeads: 0,
          proposalsSent: 0,
          orders: 0,
          installedKw: 0,
          revenue: 0,
          pendingPayments: 0,
          recentProjects: []
        };
        return { ...base, totalLeads: Math.max(0, base.totalLeads + delta) };
      },
      { revalidate: false }
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      discom: form.discom.trim(),
      monthly_bill: Number(form.monthly_bill),
      status: form.status,
      phone: form.phone.trim() || undefined
    };
    if (
      !payload.name ||
      !form.state.trim() ||
      !payload.city ||
      !payload.discom ||
      Number.isNaN(payload.monthly_bill)
    ) {
      setError(t("customers_fillRequired"));
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticRow: CustomerLead = {
      id: optimisticId,
      name: payload.name,
      city: payload.city,
      discom: payload.discom,
      monthly_bill: payload.monthly_bill,
      status: payload.status,
      phone: payload.phone ?? null
    };

    void mutate((prev) => [optimisticRow, ...(prev ?? [])], { revalidate: false });
    bumpDashboardLeads(1);
    toast.info("Saving customer", "Lead is visible instantly while SOL.52 syncs in background.");

    {
      const r = readInstallerRegion();
      setForm({
        name: "",
        city: "",
        state: r.state,
        discom: r.discom,
        monthly_bill: "",
        status: "new",
        phone: ""
      });
    }
    setShowAddModal(false);
    router.push("/");

    void (async () => {
      try {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!result.ok) throw new Error(result.error || "Could not save customer");

        const serverRow = result.data as CustomerLead;
        await mutate(
          (prev) => {
            const next = [serverRow, ...(prev ?? []).filter((c) => c.id !== optimisticId)];
            writeCustomersCache(next);
            touchCustomersSavedAt();
            return next;
          },
          { revalidate: false }
        );
        await mutateGlobal(DASHBOARD_STATS_SWR_KEY, undefined, { revalidate: true });
        toast.success("Customer saved", `${payload.name} has been added to your lead list.`);
      } catch (e) {
        await mutate(
          (prev) => (prev ?? []).filter((c) => c.id !== optimisticId),
          { revalidate: false }
        );
        bumpDashboardLeads(-1);
        await mutateGlobal(DASHBOARD_STATS_SWR_KEY, undefined, { revalidate: true });
        console.error(e);
        toast.error("Could not save customer", e instanceof Error ? e.message : "Please try again.");
      }
    })();
  }

  return (
    <>
      <div className="ss-page-shell">
        <OfflineDataNotice
          show={!online && data !== undefined}
          cacheAgeMs={getCustomersCacheAgeMs()}
          label={t("offline_customersStrip")}
        />

        {loadError && data === undefined && (
          <div className="page-lite-item rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 text-sm font-semibold text-amber-950 backdrop-blur-sm">
            {(loadError as Error).message ?? t("dashboard_errorLoad")} {t("customers_errorConnect")}
          </div>
        )}

        <div className="page-lite-item ss-page-backdrop">
          <div className="ss-card p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 sm:text-xs">{t("customers_sectionLabel")}</p>
              <h2 className="ss-section-headline mt-1 font-display">{t("customers_heading")}</h2>
              <p className="ss-section-subline max-w-xl">{t("customers_sub")}</p>
            </div>
            <button
              type="button"
              className="ss-cta-primary mt-2 w-full shrink-0 rounded-2xl px-5 py-3 sm:mt-0 sm:w-auto sm:py-3.5"
              onClick={() => setShowAddModal(true)}
            >
              {t("customers_addLeadCta")}
            </button>
          </div>
        </div>
        </div>

        <div className="page-lite-item ss-card-subtle p-3 sm:p-4 md:p-5">
          <CustomersLeadList customers={customers} loading={showListSkeleton} />
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-[12px] p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/55 bg-[hsl(var(--card))/0.96] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_30px_70px_-26px_rgba(15,23,42,0.48),0_8px_20px_-10px_rgba(15,23,42,0.24)] sm:max-h-[90vh] sm:pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-brand-800 sm:text-lg">{t("customers_addModalTitle")}</h3>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors duration-200 hover:bg-slate-200"
                onClick={() => setShowAddModal(false)}
                aria-label={t("actions_close")}
              >
                ×
              </button>
            </div>
            <form className="space-y-2.5 sm:space-y-3" onSubmit={onSubmit}>
              <p className="text-[11px] font-semibold leading-snug text-slate-600">{t("customers_regionSyncHint")}</p>
              <FloatingLabelInput
                label={t("customers_placeholderName")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <FloatingLabelSelect
                label={`${t("customers_labelState")} / UT`}
                containerClassName="my-4"
                className={modalFloatingClass}
                suppressHydrationWarning
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value, discom: "" }))}
              >
                  <option value="">{t("dashboard_selectState")}</option>
                  {INDIAN_STATES_AND_UTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </FloatingLabelSelect>
              <FloatingLabelSelect
                label={t("customers_labelDiscom")}
                containerClassName="my-4"
                className={`${modalFloatingClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                suppressHydrationWarning
                value={form.discom}
                disabled={!form.state.trim()}
                onChange={(e) => setForm((p) => ({ ...p, discom: e.target.value }))}
                aria-label={t("customers_labelDiscom")}
              >
                  {!form.state.trim() ? (
                    <option value="">{t("dashboard_selectDiscom")}</option>
                  ) : leadDiscomListLoading && leadDiscomSelectOptions.length === 0 ? (
                    <option value="">{t("dashboard_loadingDiscoms")}</option>
                  ) : (
                    <>
                      <option value="">{t("dashboard_selectDiscom")}</option>
                      {leadDiscomSelectOptions.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </>
                  )}
              </FloatingLabelSelect>
              <FloatingLabelInput
                label={t("customers_placeholderCity")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("customers_placeholderBill")}
                containerClassName="my-4"
                className={modalFloatingClass}
                type="number"
                value={form.monthly_bill}
                onChange={(e) => setForm((p) => ({ ...p, monthly_bill: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("customers_placeholderPhone")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <FloatingLabelSelect
                suppressHydrationWarning
                label={t("customers_tablePipeline")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(LEAD_STATUS_I18N_KEY[opt.value])}
                    </option>
                  ))}
              </FloatingLabelSelect>
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <button
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_-16px_rgba(20,184,166,0.9)] transition-all duration-200 hover:brightness-105"
                type="submit"
              >
                {t("actions_saveCustomer")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <p className="py-8 text-center text-sm font-semibold text-muted-foreground">Loading…</p>
      }
    >
      <CustomersPageContent />
    </Suspense>
  );
}
