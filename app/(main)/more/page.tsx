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
  parseProposalAmcYears,
  readProposalBrandingSettings,
  type ProposalAmcYears,
  type ProposalBrandingSettings,
  type ProposalThemePreset,
  writeProposalBrandingSettings
} from "@/lib/proposal-branding-settings";
import { ProposalImageUploader } from "@/components/proposal-image-uploader";
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
import { WorkspacePage, WorkspacePageHero, WorkspaceStaggerItem } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  CreditCard,
  MapPin,
  QrCode,
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
  const [companyEmail, setCompanyEmail] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerEmail);
  const [amcYears, setAmcYears] = useState<ProposalAmcYears>(DEFAULT_PROPOSAL_BRANDING_SETTINGS.amcSelectedYears);
  const [bankAccName, setBankAccName] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankAccountName);
  const [bankAccNo, setBankAccNo] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankAccountNumber);
  const [bankIfsc, setBankIfsc] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankIfsc);
  const [bankBranch, setBankBranch] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankBranch);
  const [bankUpi, setBankUpi] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankUpiId);
  const [proposalSiteImages, setProposalSiteImages] = useState<string[]>(DEFAULT_PROPOSAL_BRANDING_SETTINGS.proposalSiteImages);
  const [companyGst, setCompanyGst] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.companyGstNumber);
  const [companyLogo, setCompanyLogo] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerLogoUrl);
  const [paymentQrCodeUrl, setPaymentQrCodeUrl] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.paymentQrCodeUrl);
  const [personalizedBranding, setPersonalizedBranding] = useState(DEFAULT_PROPOSAL_BRANDING_SETTINGS.personalizedBranding);
  const [themePreset, setThemePreset] = useState<ProposalThemePreset>(DEFAULT_PROPOSAL_BRANDING_SETTINGS.themePreset);
  const [uploadingQr, setUploadingQr] = useState(false);
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
      setCompanyEmail(settings.installerEmail);
      setAmcYears(parseProposalAmcYears(settings.amcSelectedYears));
      setBankAccName(settings.bankAccountName);
      setBankAccNo(settings.bankAccountNumber);
      setBankIfsc(settings.bankIfsc);
      setBankBranch(settings.bankBranch);
      setBankUpi(settings.bankUpiId);
      setProposalSiteImages(settings.proposalSiteImages ?? []);
      setCompanyGst(settings.companyGstNumber ?? "");
      setCompanyLogo(settings.installerLogoUrl);
      setPaymentQrCodeUrl(settings.paymentQrCodeUrl ?? "");
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

  function brandingSnapshot(overrides: Partial<ProposalBrandingSettings> = {}): ProposalBrandingSettings {
    return {
      installerName: companyName.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerName,
      installerContact: companyContact.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerContact,
      installerEmail: companyEmail.trim(),
      installerLogoUrl: companyLogo.trim(),
      personalizedBranding,
      themePreset,
      paymentQrCodeUrl: paymentQrCodeUrl.trim(),
      amcSelectedYears: amcYears,
      bankAccountName: bankAccName.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankAccountName,
      bankAccountNumber: bankAccNo.trim(),
      bankIfsc: bankIfsc.trim(),
      bankBranch: bankBranch.trim(),
      bankUpiId: bankUpi.trim(),
      proposalSiteImages,
      companyGstNumber: companyGst.trim().toUpperCase(),
      ...overrides
    };
  }

  function saveCompanyProfile() {
    writeProposalBrandingSettings(brandingSnapshot());
    markSaved("Company profile saved — used when you generate the next web proposal or PPT.");
  }

  function saveProposalStyles() {
    writeProposalBrandingSettings(brandingSnapshot());
    markSaved("Proposal style updated with smooth preview settings.");
  }

  async function uploadPaymentQr(file: File | null) {
    if (!file) return;
    setUploadingQr(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/company-logo-upload", { method: "POST", body: form });
      const payload = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !payload.ok || !payload.url) throw new Error(payload.error || "QR upload failed.");
      setPaymentQrCodeUrl(payload.url);
      writeProposalBrandingSettings(brandingSnapshot({ paymentQrCodeUrl: payload.url }));
      markSaved("Payment QR code uploaded and saved.");
    } catch (e) {
      markIssue(e instanceof Error ? e.message : "QR upload failed.");
    } finally {
      setUploadingQr(false);
    }
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
      const nextUrl = payload.url;
      setCompanyLogo(nextUrl);
      writeProposalBrandingSettings(brandingSnapshot({ installerLogoUrl: nextUrl }));
      markSaved("Logo uploaded and saved for proposals & header.");
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
      <WorkspacePage tone="settings" stagger={false}>
        <WorkspaceStaggerItem>
          <WorkspacePageHero
            tone="settings"
            eyebrow="Workspace"
            title="More"
            subtitle="Company profile, region, language, performance, and plans — expand a section below."
          />
        </WorkspaceStaggerItem>

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

        <MoreGroup
          id="more-section-brand"
          icon={Building2}
          title="Brand & proposals"
          subtitle="Company, bank, QR, photos, and proposal look — tap to open."
        >
          <Subsection title="Contact" description="Name, phone, and email on proposals.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LabeledInput label="Installer / Company name" value={companyName} onChange={setCompanyName} placeholder="Harihar Solar" />
              <LabeledInput label="Contact number" value={companyContact} onChange={setCompanyContact} placeholder="+91-9993322267" />
              <div className="sm:col-span-2">
                <LabeledInput label="Email" value={companyEmail} onChange={setCompanyEmail} placeholder="harihar@solar.com" />
              </div>
              <div className="sm:col-span-2">
                <LabeledInput
                  label="GSTIN (GST number)"
                  value={companyGst}
                  onChange={(v) => setCompanyGst(v.toUpperCase())}
                  placeholder="e.g. 23AAAAA0000A1Z5"
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Printed on web proposals and PPT — leave blank until registered.
                </p>
              </div>
            </div>
          </Subsection>

          <Subsection title="Logo" description="Cover and header. Paste a URL or upload a file (Supabase: installer-branding).">
            <div className="space-y-2">
              <LabeledInput
                label="Logo URL"
                value={companyLogo}
                onChange={setCompanyLogo}
                placeholder="https://.../installer-logo.png"
              />
              <label className="inline-flex min-h-10 w-fit cursor-pointer items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-4 text-xs font-bold text-brand-800 hover:bg-brand-100">
                {uploadingLogo ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload logo file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </Subsection>

          <Subsection title="Default AMC" description="Shown on every new web proposal and PPT.">
            <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5">
              {([1, 5, 10] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setAmcYears(y)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    amcYears === y ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {y} yr{y === 1 ? "" : "s"}
                </button>
              ))}
            </div>
          </Subsection>

          <Subsection title="Bank account" description="Printed on the banking slide with your UPI ID.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LabeledInput label="Account name" value={bankAccName} onChange={setBankAccName} placeholder="Harihar Solar" />
              <LabeledInput label="Account number" value={bankAccNo} onChange={setBankAccNo} placeholder="Account No." />
              <LabeledInput label="IFSC" value={bankIfsc} onChange={setBankIfsc} placeholder="IFSC" />
              <LabeledInput label="Branch" value={bankBranch} onChange={setBankBranch} placeholder="Branch" />
              <LabeledInput label="UPI ID" value={bankUpi} onChange={setBankUpi} placeholder="e.g. harihar@hdfc" />
            </div>
          </Subsection>

          <Subsection title="Payment QR" description="Optional. High-res UPI/bank QR replaces the auto-generated QR on the banking slide.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="inline-flex min-h-10 w-fit cursor-pointer items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-4 text-xs font-bold text-brand-800 hover:bg-brand-100">
                  {uploadingQr ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Upload QR image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void uploadPaymentQr(e.target.files?.[0] ?? null)}
                    disabled={uploadingQr}
                  />
                </label>
                {paymentQrCodeUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentQrCodeUrl("");
                      writeProposalBrandingSettings(brandingSnapshot({ paymentQrCodeUrl: "" }));
                      markSaved("Payment QR code removed.");
                    }}
                    className="block text-left text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Remove QR
                  </button>
                ) : null}
              </div>
              {paymentQrCodeUrl ? (
                <div className="flex flex-col items-center gap-2 sm:items-end">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentQrCodeUrl}
                    alt="Payment QR preview"
                    className="h-28 w-28 rounded-xl border border-slate-200 object-contain p-1 shadow-sm"
                  />
                  <p className="text-[10px] font-semibold text-emerald-700">Shows on proposal banking slide</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 sm:py-4">
                  <QrCode className="h-7 w-7 text-slate-300" />
                  <p className="text-[11px] text-slate-400">Preview after upload</p>
                </div>
              )}
            </div>
          </Subsection>

          <Subsection title="Site photos" description="Up to 6 install photos (JPEG / PNG / WebP) for the deck and web proposal.">
            <ProposalImageUploader
              mode="sites"
              label="Past installation photos"
              hint="Saved with your profile when you add or remove."
              values={proposalSiteImages}
              max={6}
              onChange={(urls) => {
                setProposalSiteImages(urls);
                writeProposalBrandingSettings(brandingSnapshot({ proposalSiteImages: urls }));
              }}
            />
          </Subsection>

          <button type="button" onClick={saveCompanyProfile} className="ss-cta-primary w-full sm:w-auto">
            Save company profile
          </button>

          <div className="border-t border-slate-200/80 pt-4 dark:border-white/10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Proposal look</p>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Installer-led branding and theme for new web proposals and PPTs.
            </p>
            <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/50 bg-white/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-brand-900 sm:text-sm">Installer as star</p>
                <p className="text-[11px] font-medium text-slate-600 sm:text-xs">
                  Keeps Sol.52 minimal in the footer and your logo prominent.
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
              Proposals use Montserrat-first typography with the preset you pick here.
            </p>
          </div>
          <button type="button" onClick={saveProposalStyles} className="ss-cta-primary mt-1 w-full sm:w-auto">
            Save proposal styles
          </button>
            </div>
          </div>
        </MoreGroup>

        <MoreGroup
          id="more-section-tariff"
          icon={ReceiptText}
          title="Tariff"
          subtitle="Model status, slab preview, and reporting — tap to open."
        >
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
          {adminReady && isAdmin ? (
          <motion.a
            href="/admin/tariff-reports"
            whileHover={lightMotion ? undefined : { scale: 1.01 }}
            whileTap={lightMotion ? undefined : { scale: 0.995 }}
            className={cn(
              "glass-surface group relative mt-3 block overflow-hidden rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50/90 via-yellow-50/85 to-amber-100/90 p-4",
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
        </MoreGroup>

        <MoreGroup
          id="more-section-app"
          icon={Settings2}
          title="App"
          subtitle="Region, language, theme, and performance — tap to open."
        >
          <Subsection
            title="Operating region"
            description="Same as dashboard setup — DISCOM list comes from your state; proposals use this context."
          >
            <div className="rounded-xl border border-brand-200/60 bg-brand-50/40 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
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
          </Subsection>

          <Subsection title="Language" description={`Current support: ${supportLevel}.`}>
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
          </Subsection>

          <Subsection title="Theme" description="Light or dark for this device.">
            <div className="flex flex-wrap gap-2">
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
          </Subsection>

          <Subsection title="Install & speed" description="Whether the app can install as a PWA, and how heavy motion is on this device.">
            <div className="rounded-xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">PWA status</p>
              <p className="mt-1 text-sm font-extrabold text-brand-900 dark:text-foreground">{pwaStatus}</p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Performance mode</p>
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
                        : "border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                    )}
                  >
                    <p className="text-xs font-extrabold">{opt.label}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </Subsection>
        </MoreGroup>

        <MoreGroup
          id="more-section-plans"
          icon={CreditCard}
          title="Plans"
          subtitle="Subscriptions and a quick reminder — tap to open."
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <PlanCard title="Trial" price="Free 30 days" detail="Full Pro access to build habit fast" accent="blue" />
            <PlanCard title="Pro" price="₹299 / month" detail="Unlimited proposals for growing teams" accent="green" />
            <PlanCard title="Business" price="₹999 / month" detail="3 users + white-label control" accent="violet" />
          </div>
          <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">
            Pro is the usual pick for active proposal teams.
          </p>

          <div className="ss-card-subtle rounded-2xl p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-700 sm:text-sm">
              Save company profile before generating a proposal so the customer link picks up the latest details.
            </p>
          </div>
        </div>
        </MoreGroup>
      </WorkspacePage>
    </>
  );
}

function MoreGroup({
  id,
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className={cn(
        "ss-card workspace-more-group overflow-hidden p-0 [[open]_&_.more-chevron]:rotate-180",
        "[&_summary::-webkit-details-marker]:hidden [&_summary::marker]:content-none"
      )}
      {...(defaultOpen ? { defaultOpen: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5">
        <span className="ws-icon-well ws-icon-well--indigo shrink-0" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="workspace-more-group__title">{title}</span>
          <span className="workspace-more-group__subtitle">{subtitle}</span>
        </span>
        <ChevronDown
          className="more-chevron mt-0.5 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 border-t border-slate-200/80 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4 dark:border-white/10">{children}</div>
    </details>
  );
}

function Subsection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-slate-200/80 pt-4 first:border-t-0 first:pt-0 dark:border-white/10">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</h3>
      {description ? (
        <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
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
