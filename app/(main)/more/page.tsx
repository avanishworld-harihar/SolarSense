"use client";

import { useLanguage } from "@/lib/language-context";
import { LANGUAGE_OPTIONS } from "@/lib/language-policy";
import {
  applyPerformanceMode,
  PERFORMANCE_MODE_OPTIONS,
  readPerformanceMode,
  type PerformanceMode,
  writePerformanceMode
} from "@/lib/performance-mode";
import {
  DEFAULT_PROPOSAL_BRANDING_SETTINGS,
  readProposalBrandingSettings,
  type ProposalThemePreset,
  writeProposalBrandingSettings
} from "@/lib/proposal-branding-settings";
import { useInstallerDiscoms } from "@/hooks/use-installer-discoms";
import { supabase } from "@/lib/supabase";
import { INDIAN_STATES_AND_UTS } from "@/lib/indian-states-uts";
import {
  INSTALLER_DISCOM_KEY,
  INSTALLER_REGION_EVENT,
  INSTALLER_STATE_KEY,
  mergeSavedDiscomOption,
  readInstallerRegion,
  resolveDiscomCode,
  writeInstallerRegion
} from "@/lib/installer-region-storage";
import type { LocalScriptLocale } from "@/lib/state-to-locale";
import { getFallbackTariffContext } from "@/lib/tariff-engine";
import { cn } from "@/lib/utils";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  MapPin,
  Palette,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";

const STORAGE_LAST_RATE_REPORT_AT = "ss_last_rate_report_at";

export default function MorePage() {
  const { mode, localScript, setMode, setLocalPreference, t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [installerState, setInstallerState] = useState("");
  const [installerDiscom, setInstallerDiscom] = useState("");
  const { options: discomOptions, loading: discomListLoading } = useInstallerDiscoms(installerState);
  const discomSelectOptions = useMemo(
    () => mergeSavedDiscomOption(installerDiscom, discomOptions),
    [installerDiscom, discomOptions]
  );
  const [companyName, setCompanyName] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerName);
  const [companyContact, setCompanyContact] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerContact);
  const [companyLogo, setCompanyLogo] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerLogoUrl);
  const [personalizedBranding, setPersonalizedBranding] = useState(true);
  const [themePreset, setThemePreset] = useState<ProposalThemePreset>("greenBlueClassic");
  const [lastRateReportAt, setLastRateReportAt] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reportingRateChange, setReportingRateChange] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [tariffReportStatus, setTariffReportStatus] = useState<"none" | "pending_admin_approval" | "verified">("none");
  const [tariffStatusUpdatedAt, setTariffStatusUpdatedAt] = useState<string | null>(null);
  const [adminReady, setAdminReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingAdminReports, setPendingAdminReports] = useState(0);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("smooth");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const q = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setIsCoarsePointer(q.matches || (navigator.maxTouchPoints ?? 0) > 0);
    sync();
    q.addEventListener?.("change", sync);
    return () => q.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    try {
      const { state, discom } = readInstallerRegion();
      if (state?.trim()) setInstallerState(state.trim());
      if (discom?.trim()) setInstallerDiscom(discom.trim());
      const settings = readProposalBrandingSettings();
      setCompanyName(settings.installerName);
      setCompanyContact(settings.installerContact);
      setCompanyLogo(settings.installerLogoUrl);
      setPersonalizedBranding(settings.personalizedBranding);
      setThemePreset(settings.themePreset);
      const last = localStorage.getItem(STORAGE_LAST_RATE_REPORT_AT);
      if (last) setLastRateReportAt(last);
      const perf = readPerformanceMode();
      setPerformanceMode(perf);
      applyPerformanceMode(perf);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const { state, discom } = readInstallerRegion();
      if (state?.trim()) setInstallerState(state.trim());
      if (discom?.trim()) setInstallerDiscom(discom.trim());
    };
    window.addEventListener(INSTALLER_REGION_EVENT, sync);
    return () => window.removeEventListener(INSTALLER_REGION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!installerState.trim()) {
      setInstallerDiscom("");
      return;
    }
    if (discomOptions.length === 0) return;
    setInstallerDiscom((prev) => resolveDiscomCode(prev.trim(), discomOptions));
  }, [installerState, discomOptions]);

  /** LS me state thi, DISCOM nahi — seed tabhi jab UI state LS se match ho (naye user ke draft par mat likho). */
  useEffect(() => {
    if (!installerState.trim() || discomOptions.length === 0) return;
    let stateInLs = "";
    let discomInLs = "";
    try {
      stateInLs = localStorage.getItem(INSTALLER_STATE_KEY)?.trim() ?? "";
      discomInLs = localStorage.getItem(INSTALLER_DISCOM_KEY)?.trim() ?? "";
    } catch {
      /* ignore */
    }
    if (!stateInLs || discomInLs) return;
    if (installerState.trim() !== stateInLs) return;
    const next = resolveDiscomCode("", discomOptions);
    if (next) writeInstallerRegion(stateInLs, next);
  }, [installerState, discomOptions]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const tariff = useMemo(
    () =>
      getFallbackTariffContext(
        installerState || "Madhya Pradesh",
        installerDiscom.trim() || "MPPKVVCL"
      ),
    [installerState, installerDiscom]
  );

  useEffect(() => {
    if (!installerState || !tariff.discomLabel) return;
    void (async () => {
      try {
        const url = `/api/rate-change-report?installerState=${encodeURIComponent(installerState)}&activeTariff=${encodeURIComponent(
          tariff.discomLabel
        )}`;
        const res = await fetch(url, { cache: "no-store" });
        const payload = (await res.json()) as {
          ok?: boolean;
          data?: { status?: "none" | "pending_admin_approval" | "verified"; reportedAt?: string | null };
        };
        if (!res.ok || !payload.ok) return;
        setTariffReportStatus(payload.data?.status ?? "none");
        setTariffStatusUpdatedAt(payload.data?.reportedAt ?? null);
      } catch {
        /* ignore */
      }
    })();
  }, [installerState, tariff.discomLabel]);

  useEffect(() => {
    void (async () => {
      try {
        const current = await fetch("/api/admin/session", { method: "GET", cache: "no-store" });
        const currentPayload = (await current.json()) as {
          ok?: boolean;
          data?: { isAdmin?: boolean; pendingTariffReports?: number };
        };
        if (current.ok && currentPayload.ok && currentPayload.data?.isAdmin) {
          setIsAdmin(true);
          setPendingAdminReports(currentPayload.data.pendingTariffReports ?? 0);
          return;
        }

        const { data } = await (supabase?.auth.getUser() ?? Promise.resolve({ data: { user: null } }));
        const user = data?.user;
        if (!user) {
          setIsAdmin(false);
          setPendingAdminReports(0);
          return;
        }

        const identityPhone =
          typeof user.phone === "string" && user.phone.trim()
            ? user.phone
            : typeof user.user_metadata?.phone === "string"
              ? user.user_metadata.phone
              : null;
        const promote = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            phone: identityPhone
          })
        });
        const payload = (await promote.json()) as {
          ok?: boolean;
          data?: { isAdmin?: boolean; pendingTariffReports?: number };
        };
        if (!promote.ok || !payload.ok || !payload.data?.isAdmin) {
          setIsAdmin(false);
          setPendingAdminReports(0);
          return;
        }
        setIsAdmin(true);
        setPendingAdminReports(payload.data.pendingTariffReports ?? 0);
      } catch {
        setIsAdmin(false);
        setPendingAdminReports(0);
      } finally {
        setAdminReady(true);
      }
    })();
  }, []);

  const pwaStatus = useMemo(() => {
    if (typeof window === "undefined") return "Checking...";
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const sw = "serviceWorker" in navigator;
    if (standalone) return "Installed";
    if (sw) return "Installable (PWA ready)";
    return "Web mode";
  }, []);

  function markSaved(message: string) {
    setSuccessMessage(message);
    toast.success("Saved", message);
  }

  function markIssue(message: string) {
    setSuccessMessage(message);
    toast.error("Action failed", message);
  }

  function updatePerformanceMode(mode: PerformanceMode) {
    setPerformanceMode(mode);
    writePerformanceMode(mode);
    applyPerformanceMode(mode);
    markSaved(`Performance mode set to ${PERFORMANCE_MODE_OPTIONS.find((o) => o.id === mode)?.label ?? mode}.`);
  }

  function saveCompanyProfile() {
    writeProposalBrandingSettings({
      installerName: companyName.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerName,
      installerContact: companyContact.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerContact,
      installerLogoUrl: companyLogo.trim(),
      personalizedBranding,
      themePreset
    });
    markSaved("Company profile saved for PPT/PDF branding.");
  }

  function saveProposalStyles() {
    writeProposalBrandingSettings({
      installerName: companyName.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerName,
      installerContact: companyContact.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerContact,
      installerLogoUrl: companyLogo.trim(),
      personalizedBranding,
      themePreset
    });
    markSaved("Proposal style updated with smooth preview settings.");
  }

  function saveOperatingRegion() {
    const next = installerState.trim();
    const d = installerDiscom.trim();
    if (!next || !d) {
      markIssue("Choose your state / UT and DISCOM first.");
      return;
    }
    try {
      writeInstallerRegion(next, d);
      markSaved("Operating region saved. Dashboard first-time card stays hidden; proposals & tariff use this.");
    } catch {
      markIssue("Could not save — storage may be blocked.");
    }
  }

  function changeLanguage(code: (typeof LANGUAGE_OPTIONS)[number]["code"]) {
    if (code === "en") {
      setMode("en");
    } else {
      setLocalPreference(code as LocalScriptLocale);
      setMode("local");
    }
    markSaved(`${LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? "Language"} preference saved.`);
  }

  async function reportRateChange() {
    if (reportingRateChange) return;
    setReportingRateChange(true);
    const stamp = new Date().toISOString();
    try {
      const res = await fetch("/api/rate-change-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installerName: companyName || "Unknown Installer",
          installerState,
          activeTariff: tariff.discomLabel,
          note: "Reported from More > Tariff Center"
        })
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Could not log rate change.");
      try {
        localStorage.setItem(STORAGE_LAST_RATE_REPORT_AT, stamp);
      } catch {
        /* ignore */
      }
      setLastRateReportAt(stamp);
      setTariffReportStatus("pending_admin_approval");
      setTariffStatusUpdatedAt(stamp);
      markSaved("Rate change logged in Supabase. Thank you for improving tariff data.");
    } catch (e) {
      markIssue(e instanceof Error ? e.message : "Rate-change logging failed.");
    } finally {
      setReportingRateChange(false);
    }
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/company-logo-upload", { method: "POST", body: form });
      const payload = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !payload.ok || !payload.url) throw new Error(payload.error || "Logo upload failed.");
      setCompanyLogo(payload.url);
      markSaved("Logo uploaded to Supabase Storage.");
    } catch (e) {
      markIssue(e instanceof Error ? e.message : "Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  }

  const selectedLanguage = mode === "en" ? "en" : localScript;
  const lightMotion = prefersReducedMotion || isCoarsePointer;
  const supportLevel = useMemo(() => {
    const row = LANGUAGE_OPTIONS.find((o) => o.code === selectedLanguage);
    return row?.status === "live" ? "Live now" : "Rolling out (English fallback safe)";
  }, [selectedLanguage]);

  return (
    <>
      <div className="ss-page-shell">
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={lightMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={lightMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              className="glass-surface flex items-center gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-50/80 p-3 text-xs font-semibold text-emerald-800 sm:text-sm"
            >
              <BadgeCheck className="h-4 w-4 shrink-0" />
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionCard icon={Building2} title="My Company Profile" subtitle="Installer as STAR — used in proposal cover, PDF, and sales deck.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <LabeledInput label="Installer / Company name" value={companyName} onChange={setCompanyName} placeholder="Harihar Solar" />
            <LabeledInput label="Contact number" value={companyContact} onChange={setCompanyContact} placeholder="+91-9993322267" />
            <div className="sm:col-span-2">
              <LabeledInput
                label="Logo URL (big brand in PPT/PDF)"
                value={companyLogo}
                onChange={setCompanyLogo}
                placeholder="https://.../installer-logo.png"
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-4 text-xs font-bold text-brand-800 hover:bg-brand-100">
                  {uploadingLogo ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Upload Logo File
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
                    disabled={uploadingLogo}
                  />
                </label>
                <span className="text-[11px] font-semibold text-slate-600 sm:text-xs">
                  Upload goes to Supabase Storage bucket: installer-branding
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={saveCompanyProfile} className="ss-cta-primary mt-2 w-full sm:w-auto">
            Save Company Profile
          </button>
        </SectionCard>

        <SectionCard icon={ReceiptText} title="Tariff Center" subtitle="Keep numbers trustworthy — transparent tariff signal builds buyer confidence.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoChip label="Active tariff" value={tariff.discomLabel} />
            <InfoChip label="Model source" value={tariff.source === "fallback" ? "Verified fallback" : "Live DB"} />
            <InfoChip label="Energy slab 1" value={`₹${tariff.energySlabs[0]?.rate ?? 0}/unit`} />
            <InfoChip
              label="Duty mode"
              value={tariff.dutyMode === "percent_energy_plus_fixed" ? "Energy + fixed %" : tariff.dutyMode}
            />
          </div>
          <div className="rounded-xl border border-white/55 bg-white/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Update status</p>
            <p
              className={cn(
                "mt-1 text-sm font-extrabold",
                tariffReportStatus === "verified"
                  ? "text-emerald-700"
                  : tariffReportStatus === "pending_admin_approval"
                    ? "text-amber-700"
                    : "text-slate-700"
              )}
            >
              {tariffReportStatus === "verified"
                ? "Verified by admin"
                : tariffReportStatus === "pending_admin_approval"
                  ? "Pending admin approval"
                  : "No pending updates"}
            </p>
            {tariffStatusUpdatedAt ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-600">
                Last status update: {new Date(tariffStatusUpdatedAt).toLocaleString("en-IN")}
              </p>
            ) : null}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void reportRateChange()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
              disabled={reportingRateChange}
            >
              {reportingRateChange ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : null}
              Report Rate Change
            </button>
            {lastRateReportAt ? (
              <span className="text-[11px] font-semibold text-slate-600 sm:text-xs">
                Last report logged: {new Date(lastRateReportAt).toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
        </SectionCard>

        {adminReady && isAdmin ? (
          <motion.a
            href="/admin/tariff-reports"
            whileHover={lightMotion ? undefined : { scale: 1.01 }}
            whileTap={lightMotion ? undefined : { scale: 0.995 }}
            className={cn(
              "glass-surface group relative block overflow-hidden rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50/90 via-yellow-50/85 to-amber-100/90 p-4",
              "shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_14px_34px_rgba(245,158,11,0.15)]"
            )}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/20"
              animate={lightMotion ? { opacity: 0.22 } : { opacity: [0.18, 0.36, 0.18] }}
              transition={lightMotion ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Admin Intelligence Portal</p>
                <p className="mt-1 text-base font-extrabold text-amber-950">Pending Tariff Reports</p>
                <p className="mt-1 text-xs font-semibold text-amber-800/90">
                  Approve AI-detected mismatches only after verification.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white/85 px-3 py-2 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <span className="text-lg font-black text-amber-900">{pendingAdminReports}</span>
              </div>
            </div>
          </motion.a>
        ) : null}

        <SectionCard
          icon={Palette}
          title="Proposal Styles"
          subtitle="Sales psychology: big installer branding + consistent visual identity = higher trust and faster yes."
        >
          <div className="rounded-xl border border-white/50 bg-white/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-brand-900 sm:text-sm">Installer as Star</p>
                <p className="text-[11px] font-medium text-slate-600 sm:text-xs">
                  Personalized Branding keeps Sol.52 tiny footer and installer logo dominant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPersonalizedBranding((v) => !v);
                  markSaved(`Personalized branding ${!personalizedBranding ? "enabled" : "disabled"}.`);
                }}
                className={cn(
                  "inline-flex h-8 min-w-20 items-center justify-center rounded-full px-3 text-xs font-bold transition",
                  personalizedBranding ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                )}
              >
                {personalizedBranding ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ThemePresetCard
              title="Green/Blue Classic"
              desc="Trusted enterprise tone"
              active={themePreset === "greenBlueClassic"}
              onClick={() => {
                setThemePreset("greenBlueClassic");
                markSaved("Classic Green/Blue style selected.");
              }}
            />
            <ThemePresetCard
              title="Green/Blue Vivid"
              desc="High-energy conversion look"
              active={themePreset === "greenBlueVivid"}
              onClick={() => {
                setThemePreset("greenBlueVivid");
                markSaved("Vivid Green/Blue style selected.");
              }}
            />
          </div>

          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/80 p-3">
            <p className="text-xs font-semibold text-indigo-900 sm:text-sm">
              <strong>Visual consistency:</strong> Proposal now stays Montserrat-first with Green/Blue theme presets.
            </p>
          </div>
          <button type="button" onClick={saveProposalStyles} className="ss-cta-primary mt-1 w-full sm:w-auto">
            Save Proposal Styles
          </button>
        </SectionCard>

        <SectionCard icon={Settings2} title="App Settings" subtitle="High-signal controls: language, theme, and app install confidence.">
          <div className="rounded-xl border border-brand-200/60 bg-brand-50/40 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-extrabold text-brand-900 dark:text-foreground">Operating region</p>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-muted-foreground">
                    Set once from the dashboard; after that the setup card hides. Change your state / UT here anytime — proposals and tariff defaults follow this.
                  </p>
                </div>
                <FloatingLabelSelect
                  label="State / UT"
                  containerClassName="my-1"
                  suppressHydrationWarning
                  value={installerState}
                  onChange={(e) => setInstallerState(e.target.value)}
                  className="h-11"
                >
                  <option value="">Select state / UT…</option>
                  {INDIAN_STATES_AND_UTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </FloatingLabelSelect>
                <FloatingLabelSelect
                  label={t("dashboard_selectDiscom")}
                  containerClassName="my-1"
                  suppressHydrationWarning
                  value={installerDiscom}
                  disabled={!installerState.trim()}
                  onChange={(e) => setInstallerDiscom(e.target.value)}
                  className="h-11 disabled:opacity-60"
                  aria-label={t("dashboard_selectDiscom")}
                >
                  {!installerState.trim() ? (
                    <option value="">{t("dashboard_selectDiscom")}</option>
                  ) : discomListLoading && discomSelectOptions.length === 0 ? (
                    <option value="">{t("dashboard_loadingDiscoms")}</option>
                  ) : (
                    <>
                      <option value="">{t("dashboard_selectDiscom")}</option>
                      {discomSelectOptions.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </>
                  )}
                </FloatingLabelSelect>
                <button type="button" onClick={saveOperatingRegion} className="ss-cta-primary w-full sm:w-auto">
                  Save operating region
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Language (6 options)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => changeLanguage(opt.code)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    selectedLanguage === opt.code
                      ? "border-brand-500 bg-brand-50 text-brand-900"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300"
                  )}
                >
                  <p className="text-xs font-extrabold">
                    {opt.label}{" "}
                    <span className={cn("ml-1 text-[10px]", opt.status === "live" ? "text-emerald-600" : "text-amber-600")}>
                      {opt.status === "live" ? "Live" : "Beta"}
                    </span>
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">{opt.native}</p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-600">Language support status: {supportLevel}</p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Light / Dark Mode</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTheme("light");
                  markSaved("Light mode applied.");
                }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold",
                  resolvedTheme === "light" ? "border-brand-500 bg-brand-50 text-brand-900" : "border-slate-200 bg-white"
                )}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme("dark");
                  markSaved("Dark mode applied.");
                }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold",
                  resolvedTheme === "dark" ? "border-brand-500 bg-brand-50 text-brand-900" : "border-slate-200 bg-white"
                )}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-3">
            <p className="text-xs font-bold text-slate-700">PWA Status</p>
            <p className="mt-1 text-sm font-extrabold text-brand-900">{pwaStatus}</p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Performance Mode</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PERFORMANCE_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updatePerformanceMode(opt.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    performanceMode === opt.id
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300"
                  )}
                >
                  <p className="text-xs font-extrabold">{opt.label}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={CreditCard} title="Subscription" subtitle="Plan clarity improves intent and reduces price hesitation.">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <PlanCard title="Trial" price="Free 30 days" detail="Full Pro access to build habit fast" accent="blue" />
            <PlanCard title="Pro" price="₹299 / month" detail="Unlimited proposals for growing teams" accent="green" />
            <PlanCard title="Business" price="₹999 / month" detail="3 users + white-label control" accent="violet" />
          </div>
          <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">
            Suggestion: keep Pro highlighted to maximize conversion (best value anchor).
          </p>
        </SectionCard>

        <div className="ss-card-subtle rounded-2xl p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-700 sm:text-sm">
              Silicon Valley UX principle: one clear action per block, instant feedback, and no hidden state.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="ss-card space-y-3 p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-brand-900 sm:text-base">{title}</h2>
          <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <FloatingLabelInput
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/55 bg-white/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-brand-900">{value}</p>
    </div>
  );
}

function ThemePresetCard({
  title,
  desc,
  active,
  onClick
}: {
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-3 text-left transition",
        active ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white/80 hover:border-brand-300"
      )}
    >
      <p className="text-sm font-extrabold text-brand-900">{title}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-600">{desc}</p>
    </button>
  );
}

function PlanCard({
  title,
  price,
  detail,
  accent
}: {
  title: string;
  price: string;
  detail: string;
  accent: "blue" | "green" | "violet";
}) {
  const accentClass =
    accent === "green"
      ? "border-emerald-300 bg-emerald-50/70"
      : accent === "violet"
        ? "border-violet-300 bg-violet-50/70"
        : "border-sky-300 bg-sky-50/70";
  return (
    <div className={cn("rounded-xl border p-3", accentClass)}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <p className="mt-1 text-base font-extrabold text-brand-900">{price}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-700">{detail}</p>
    </div>
  );
}
