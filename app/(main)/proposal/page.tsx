"use client";

import dynamic from "next/dynamic";
import { useLanguage } from "@/lib/language-context";
import {
  applyTariffCategoryOverride,
  estimateMonthlyKwhFromBillAmount,
  getFallbackTariffContext
} from "@/lib/tariff-engine";
import { inferMpLv12SanctionedLoadKwWhenBillOmits } from "@/lib/mp-tariff-2025-26";
import { calculateSolar, computeGrossSystemCostInr, DEFAULT_TARIFF_CONTEXT } from "@/lib/solar-engine";
import type { CustomerLead, MonthlyUnits } from "@/lib/types";
import type { TariffContext } from "@/lib/tariff-types";
import {
  countFilledMonths,
  emptyMonthlyUnits,
  mergeParsedMonthsIntoUnits,
  type ParsedBillShape
} from "@/lib/bill-parse";
import { INDIAN_STATES_AND_UTS } from "@/lib/indian-states-uts";
import { INSTALLER_REGION_EVENT, readInstallerRegion } from "@/lib/installer-region-storage";
import { formatInstallerContactLine, readProposalBrandingSettings } from "@/lib/proposal-branding-settings";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import {
  getBillingRule,
  getBillingUploadRequirement,
  isBillMonthAlignedForOffset
} from "@/lib/discom-billing-rules";
import { pickProposalLeadPhone, patchLeadPhoneIfProvided } from "@/lib/lead-phone";
import { mergeCustomerForProposal, type ManualProposalCustomer } from "@/lib/merge-proposal-customer";
import { isBillBackedFromBuilderState } from "@/lib/proposal-bill-audit-eligibility";
import { swrDiscomsWithOfflineCache, swrTariffWithOfflineCache } from "@/lib/proposal-swr-fetchers";
import { CUSTOMERS_SWR_KEY, fetchCustomersLoose } from "@/lib/customers-client";
import { DASHBOARD_STATS_SWR_KEY } from "@/lib/dashboard-stats-client";
import { ProposalQuickPreview } from "@/components/proposal/proposal-quick-preview";
import { WorkspacePage, WorkspacePageHero } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { Building2, Download, FileUp, Globe, MessageCircle, Send, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parsePrefillFromSearchParams } from "@/lib/quick-actions";
import { ProposalPresetPicker, type ProposalPresetId } from "@/components/proposals/os/preset-picker";
import { ProposalOSHeader } from "@/components/proposals/os/proposal-os-header";
import { BuilderStageBar } from "@/components/proposals/os/builder-stage-bar";
import { ProposalLivePreviewPanel } from "@/components/proposals/os/live-preview-panel";
import { BlockPlaylistEditor } from "@/components/proposals/os/block-playlist-editor";
import { CommercialNarrativePanel } from "@/components/commercial/commercial-narrative-panel";
import { ProposalReviewSheet } from "@/components/commercial/proposal-review-sheet";
import { CommercialCategorySelector } from "@/components/commercial/commercial-category-selector";
import { CommercialInputModeSelector } from "@/components/commercial/commercial-input-mode";
import {
  applyCommercialFlagsToLayout,
  defaultCommercialConfig,
  withOrgStory,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import { getPresetDefaultLayout } from "@/lib/proposal-preset-engine";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import useSWR, { useSWRConfig } from "swr";

const BillAnalysisCharts = dynamic(
  () => import("@/components/bill-analysis-charts").then((m) => ({ default: m.BillAnalysisCharts })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-2xl" />
  }
);

const PIPELINE_SWR_KEY = "/api/pipeline";
const CLIENT_REF_STORAGE_KEY = "ss_device_ref";
const LEARNED_BILL_PROFILE_KEY = "ss_bill_upload_profile_v1";
const SESSION_STATE_KEY = "ss_proposal_session_v2";

type LearnedBillProfile = {
  requiredBills: number;
  historyWindowMonths: number;
  updatedAt: string;
};

function profileKey(stateRaw: string, discomRaw: string): string {
  return `${stateRaw.trim().toLowerCase().replace(/\s+/g, " ")}::${discomRaw.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function inferProfileFromBill(parsed: ParsedBillShape): LearnedBillProfile | null {
  const historyWindow = Math.max(1, Math.min(12, parsed.consumption_history?.length ?? 0));
  if (!historyWindow || historyWindow >= 12) return { requiredBills: 1, historyWindowMonths: 12, updatedAt: new Date().toISOString() };
  const requiredBills = Math.max(1, Math.min(6, Math.ceil(12 / historyWindow)));
  return { requiredBills, historyWindowMonths: historyWindow, updatedAt: new Date().toISOString() };
}

function createClientRef(): string {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  const uuid = c?.randomUUID?.();
  if (uuid) return `ss-${uuid}`;
  return `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function billInrFromParsed(v: number | string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Keep only the first meaningful token from connection_type so bill-printed codes
 * like "LT" / "LV2.2" / "LT-II" are not expanded by the AI into long descriptions.
 * Max 40 chars; strips trailing " - description" patterns.
 */
function truncateConnectionType(raw: string): string {
  if (!raw) return "";
  // Remove " - " and anything after it (AI often appends " - Low Tension / Commercialâ€¦")
  const cleaned = raw.replace(/\s*[-â€“]\s+(low tension|high tension|commercial|domestic|industrial|lt|ht).*/i, "").trim();
  return cleaned.slice(0, 40).trim();
}

/** Normalize phase label for forms (MPEZ prints "SINGLE"). */
function normalizeBillPhaseLabel(raw?: string | null): string {
  const s = raw?.trim() ?? "";
  if (!s) return "";
  const u = s.toUpperCase();
  if (/\bSINGLE\b|1\s*-?\s*PH/.test(u)) return "Single";
  if (/\bTHREE\b|3\s*-?\s*PH/.test(u)) return "Three";
  return s;
}

function parseManualContractKva(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseFloat(t.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** MP smart billing â€” bill OCR cross-checks forwarded to the PPT / proposal API. */
function buildMpSmartBillingApiPayload(manual: ManualProposalCustomer, latestBill: ParsedBillShape | null, previousBill: ParsedBillShape | null) {
  const ref = latestBill ?? previousBill;
  const purpose =
    manual.purposeOfSupply.trim() || ref?.purpose_of_supply?.trim() || ref?.connection_type?.trim() || "";
  const cd = parseManualContractKva(manual.contractDemandKva) ?? billInrFromParsed(ref?.contract_demand_kva ?? null);
  return {
    ...(purpose ? { purposeOfSupply: purpose } : {}),
    ...(cd != null ? { contractDemandKva: cd } : {}),
    ...(billInrFromParsed(ref?.energy_charges_inr) != null
      ? { billEnergyChargesInr: billInrFromParsed(ref?.energy_charges_inr) }
      : {}),
    ...(billInrFromParsed(ref?.electricity_duty_inr) != null
      ? { billElectricityDutyInr: billInrFromParsed(ref?.electricity_duty_inr) }
      : {}),
    ...(billInrFromParsed(ref?.fppas_inr) != null
      ? { billFppasInr: billInrFromParsed(ref?.fppas_inr) }
      : {}),
    ...(billInrFromParsed(ref?.fixed_charges_inr) != null
      ? { billFixedChargeInr: billInrFromParsed(ref?.fixed_charges_inr) }
      : {}),
    ...(billInrFromParsed(ref?.metered_unit_consumption) != null
      ? { referenceBillUnits: billInrFromParsed(ref?.metered_unit_consumption) }
      : {})
  };
}

type PersistenceSnapshotResponse = {
  latestBillUpload?: {
    parsedBill?: ParsedBillShape | null;
    monthlyUnits?: Partial<MonthlyUnits> | null;
  } | null;
  latestCalculation?: {
    monthlyUnits?: MonthlyUnits | null;
    manualSnapshot?: Partial<ManualProposalCustomer> | null;
    latestBill?: ParsedBillShape | null;
    previousBill?: ParsedBillShape | null;
  } | null;
};

type UploadTask = {
  slot: "latest" | number;
  file: File;
};

type SessionSnap = {
  manual: ManualProposalCustomer;
  monthlyUnits: MonthlyUnits;
  latestBill: ParsedBillShape | null;
  additionalBills: (ParsedBillShape | null)[];
  auditedMonthTotals: Partial<Record<keyof MonthlyUnits, number>>;
  overrideSolarKw: string;
  overridePanels: string;
};

function loadSession(): SessionSnap | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnap;
  } catch {
    return null;
  }
}

function saveSession(snap: SessionSnap) {
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(snap));
  } catch {
    /* quota exceeded or private mode â€” ignore */
  }
}

function isReloadNavigation(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

export default function ProposalPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { mutate: mutateGlobal } = useSWRConfig();

  const bootFromReload = useMemo(() => isReloadNavigation(), []);
  const sessionSnap = useMemo(() => {
    if (bootFromReload) {
      try {
        sessionStorage.removeItem(SESSION_STATE_KEY);
      } catch {
        /* ignore */
      }
      return null;
    }
    return loadSession();
  }, [bootFromReload]);

  const [monthlyUnits, setMonthlyUnits] = useState<MonthlyUnits>(() => sessionSnap?.monthlyUnits ?? emptyMonthlyUnits());
  const [latestBill, setLatestBill] = useState<ParsedBillShape | null>(sessionSnap?.latestBill ?? null);
  const [additionalBills, setAdditionalBills] = useState<(ParsedBillShape | null)[]>(sessionSnap?.additionalBills ?? []);
  const [auditedMonthTotals, setAuditedMonthTotals] = useState<Partial<Record<keyof MonthlyUnits, number>>>(sessionSnap?.auditedMonthTotals ?? {});
  const [billAnalysis, setBillAnalysis] = useState("");
  const [billAnalysisTone, setBillAnalysisTone] = useState<"neutral" | "success" | "warning" | "error">("neutral");
  const [scanTimingBadge, setScanTimingBadge] = useState("");
  const [isAnalyzingLatest, setIsAnalyzingLatest] = useState(false);
  const [isAnalyzingAdditional, setIsAnalyzingAdditional] = useState<boolean[]>([]);
  const [isPptDownloading, setIsPptDownloading] = useState(false);
  const [isCopyingSummary, setIsCopyingSummary] = useState(false);
  const [isWebProposalBusy, setIsWebProposalBusy] = useState(false);
  const [latestWebProposalUrl, setLatestWebProposalUrl] = useState<string | null>(null);
  // Proposal Builder Settings â€” language + EMI only (logo, bank, AMC, site photos live in More > Company Profile).
  const [proposalLang, setProposalLang] = useState<"en" | "hi">("en");
  const [financeRatePct, setFinanceRatePct] = useState(7);
  /** Set when a walk-in lead was auto-created during the last generate (for CRM deep-link). */
  const [lastAutoLeadId, setLastAutoLeadId] = useState<string | null>(null);
  const [showProposalSettings, setShowProposalSettings] = useState(false);
  const [overrideSolarKw, setOverrideSolarKw] = useState(sessionSnap?.overrideSolarKw ?? "");
  const [overridePanels, setOverridePanels] = useState(sessionSnap?.overridePanels ?? "");
  const [installerState, setInstallerState] = useState("");
  const [installerDiscom, setInstallerDiscom] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const [learnedBillProfiles, setLearnedBillProfiles] = useState<Record<string, LearnedBillProfile>>({});

  // â”€â”€ URL prefill (Wave 2 P5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Read ?preset=â€¦&orgType=â€¦&kw=â€¦&lang=â€¦&story=â€¦ on first render only.
  // useSearchParams() is safe here â€” the page is already a client component.
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPrefill = useMemo(
    () => parsePrefillFromSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally run once; URL params are consumed on mount
  );

  // â”€â”€ Proposal OS UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [osPresetId, setOsPresetId] = useState<ProposalPresetId | null>(
    urlPrefill.preset ?? null
  );
  // When a preset is pre-selected via URL, skip the preset picker overlay.
  const [showPresetPicker, setShowPresetPicker] = useState(!urlPrefill.preset);
  const [showBlockPlaylist, setShowBlockPlaylist] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [commercialConfig, setCommercialConfig] = useState<CommercialProposalConfig | null>(null);
  const [proposalLayout, setProposalLayout] = useState<ProposalTemplateV1 | null>(null);
  // Commercial input mode â€” "bill" uses existing upload flow; "requirement" shows simple form
  const [commercialInputMode, setCommercialInputMode] = useState<"bill" | "requirement">("bill");
  // Requirement-mode form fields (written to manual state on change)
  const [requirementMonthlyKwh, setRequirementMonthlyKwh] = useState("");
  const [requirementNotes, setRequirementNotes] = useState("");

  const lastCalcPersistSignatureRef = useRef("");
  const uploadQueueRef = useRef<UploadTask[]>([]);
  const uploadWorkerRunningRef = useRef(false);
  const [manual, setManual] = useState<ManualProposalCustomer>(sessionSnap?.manual ?? {
    leadContactName: "",
    leadPhone: "",
    billPhone: "",
    officialBillName: "",
    city: "",
    discom: "",
    state: "",
    consumerId: "",
    meterNumber: "",
    connectionDate: "",
    phase: "",
    connectionType: "",
    sanctionedLoad: "",
    billingAddress: "",
    tariffCategory: "",
    purposeOfSupply: "",
    contractDemandKva: ""
  });
  const step1Label = stripStepPrefix(t("proposal_step1SelectLead"));
  const step2Label = stripStepPrefix(t("proposal_step2BillUploads"));
  const monthlyUnitsTitle = stripManualSuffix(t("proposal_monthlyUnitsTitle"));

  useEffect(() => {
    const { state, discom } = readInstallerRegion();
    if (state) setInstallerState(state);
    if (discom) setInstallerDiscom(discom);

    let ref = localStorage.getItem(CLIENT_REF_STORAGE_KEY);
    if (!ref) {
      ref = createClientRef();
      localStorage.setItem(CLIENT_REF_STORAGE_KEY, ref);
    }
    setClientRef(ref);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(LEARNED_BILL_PROFILE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, LearnedBillProfile>;
      setLearnedBillProfiles(parsed);
    } catch {
      // ignore malformed local cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LEARNED_BILL_PROFILE_KEY, JSON.stringify(learnedBillProfiles));
  }, [learnedBillProfiles]);

  // Persist session across tab switches â€” debounced so typing does not freeze the UI.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveSession({
        manual,
        monthlyUnits,
        latestBill,
        additionalBills,
        auditedMonthTotals,
        overrideSolarKw,
        overridePanels
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [manual, monthlyUnits, latestBill, additionalBills, auditedMonthTotals, overrideSolarKw, overridePanels]);

  useEffect(() => {
    const sync = () => {
      const { state, discom } = readInstallerRegion();
      if (state) setInstallerState(state);
      if (discom) setInstallerDiscom(discom);
    };
    window.addEventListener(INSTALLER_REGION_EVENT, sync);
    return () => window.removeEventListener(INSTALLER_REGION_EVENT, sync);
  }, []);

  useEffect(() => {
    setHydratedFromServer(false);
  }, [selectedLeadId]);

  // deepLinkLeadIdRef and its effects are declared below, after `customers` is in scope.

  const stateForSizing = manual.state.trim() || installerState;
  const discomQuery = manual.discom.trim() || installerDiscom.trim();
  const stateQuery = manual.state.trim() || installerState.trim();
  const connectedLoadKw = useMemo(() => {
    const parsed = parseConnectedLoadKw(manual.sanctionedLoad);
    if (parsed != null && parsed > 0) return parsed;
    const ref = latestBill ?? additionalBills.find((b): b is ParsedBillShape => Boolean(b));
    const kw = inferMpLv12SanctionedLoadKwWhenBillOmits({
      sanctioned_load: ref?.sanctioned_load,
      state: (manual.state || ref?.state || "").trim() || undefined,
      discom: (manual.discom || ref?.discom || "").trim() || undefined,
      connection_type: manual.connectionType || ref?.connection_type,
      purpose_of_supply: manual.purposeOfSupply || ref?.purpose_of_supply || undefined,
      phase: manual.phase || ref?.phase,
      tariff_category: manual.tariffCategory || ref?.tariff_category
    });
    return kw ?? null;
  }, [
    manual.sanctionedLoad,
    manual.state,
    manual.discom,
    manual.connectionType,
    manual.purposeOfSupply,
    manual.phase,
    manual.tariffCategory,
    latestBill,
    additionalBills
  ]);
  const areaProfile = useMemo(() => inferAreaProfile(manual), [manual]);
  const billingRule = useMemo(() => getBillingRule(stateQuery, discomQuery), [stateQuery, discomQuery]);
  const learnedProfile = useMemo(() => {
    if (!stateQuery || !discomQuery) return null;
    return learnedBillProfiles[profileKey(stateQuery, discomQuery)] ?? null;
  }, [stateQuery, discomQuery, learnedBillProfiles]);
  const billProfileUrl =
    stateQuery && discomQuery
      ? `/api/discom-bill-profile?state=${encodeURIComponent(stateQuery)}&discom=${encodeURIComponent(discomQuery)}`
      : null;
  const { data: syncedBillProfileRes } = useSWR(
    billProfileUrl,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store" });
      const payload = (await res.json()) as {
        ok?: boolean;
        data?: { requiredBills?: number; historyWindowMonths?: number; updatedAt?: string | null } | null;
      };
      if (!payload.ok || !payload.data) return null;
      const profile = payload.data;
      const requiredBills = Math.max(1, Number(profile.requiredBills ?? 1) || 1);
      const historyWindowMonths = Math.max(1, Number(profile.historyWindowMonths ?? 6) || 6);
      return {
        requiredBills,
        historyWindowMonths,
        updatedAt: String(profile.updatedAt ?? new Date().toISOString())
      } as LearnedBillProfile;
    },
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  // Keep required uploader count consistent across devices by using server profile only.
  const effectiveLearnedProfile = syncedBillProfileRes ?? null;
  const normalizeUploadRequirement = useCallback(
    (input: ReturnType<typeof getBillingUploadRequirement>): ReturnType<typeof getBillingUploadRequirement> => {
      // MP seasonal mode should stay deterministic: latest + one 6-month-back bill.
      const isMpSeasonalMode =
        billingRule.mode === "latest_and_months_back" &&
        (billingRule.secondaryOffsetMonths ?? 0) === 6 &&
        (billingRule.historyWindowMonthsPerBill ?? 0) === 6;
      if (!isMpSeasonalMode) return input;
      const cappedRequired = Math.min(2, Math.max(1, input.requiredBills));
      return {
        requiredBills: cappedRequired,
        secondaryOffsets: input.secondaryOffsets.slice(0, Math.max(0, cappedRequired - 1)),
        secondaryLabels: input.secondaryLabels.slice(0, Math.max(0, cappedRequired - 1))
      };
    },
    [billingRule]
  );
  const uploadRequirement = useMemo(
    () => {
      const detectedHistoryMonths = latestBill?.consumption_history?.length ?? effectiveLearnedProfile?.historyWindowMonths ?? null;
      const base = normalizeUploadRequirement(getBillingUploadRequirement(billingRule, latestBill?.bill_month, detectedHistoryMonths));
      if (base.requiredBills > 1) return base;
      if (!effectiveLearnedProfile || effectiveLearnedProfile.requiredBills <= 1) return base;
      return normalizeUploadRequirement(
        getBillingUploadRequirement(
        {
          ...billingRule,
          mode: "latest_and_months_back",
          secondaryOffsetMonths: effectiveLearnedProfile.historyWindowMonths,
          historyWindowMonthsPerBill: effectiveLearnedProfile.historyWindowMonths,
          targetCoverageMonths: 12,
          minBillsRequired: effectiveLearnedProfile.requiredBills
        },
        latestBill?.bill_month,
        effectiveLearnedProfile.historyWindowMonths
      ));
    },
    [billingRule, latestBill?.bill_month, latestBill?.consumption_history, effectiveLearnedProfile, normalizeUploadRequirement]
  );
  const previousBill = additionalBills[0] ?? null;
  const isAnySecondaryBusy = isAnalyzingAdditional.some(Boolean);
  const uploadedCoverageMonths = useMemo(() => {
    const merged = new Set<keyof MonthlyUnits>();
    const allBills = [latestBill, ...additionalBills].filter(Boolean) as ParsedBillShape[];
    for (const bill of allBills) {
      for (const key of extractDetectedMonths(bill)) merged.add(key);
    }
    return merged.size;
  }, [latestBill, additionalBills]);
  const requiredSecondaryCount = useMemo(() => {
    const base = Math.max(0, uploadRequirement.requiredBills - 1);
    if (uploadedCoverageMonths < 12) return base;
    // If we already covered all 12 months with uploaded bills, don't force extra slots.
    return Math.min(base, additionalBills.filter(Boolean).length);
  }, [uploadRequirement.requiredBills, uploadedCoverageMonths, additionalBills]);
  const secondaryAlignment = useMemo(
    () =>
      uploadRequirement.secondaryOffsets.map((offset, idx) => {
        const current = additionalBills[idx]?.bill_month ?? null;
        const aligned = isBillMonthAlignedForOffset(latestBill?.bill_month, current, offset);
        return { offset, current, aligned };
      }),
    [uploadRequirement.secondaryOffsets, additionalBills, latestBill?.bill_month]
  );
  const hasRequiredBillInputs = Boolean(latestBill) &&
    additionalBills.slice(0, requiredSecondaryCount).filter(Boolean).length === requiredSecondaryCount &&
    secondaryAlignment.every((item, idx) => idx >= requiredSecondaryCount || item.aligned);
  const tariffUrl = `/api/tariff-context?state=${encodeURIComponent(stateQuery)}&discom=${encodeURIComponent(discomQuery)}`;
  const discomsUrl = `/api/discoms?state=${encodeURIComponent(stateQuery)}`;

  const { data: tariffRes } = useSWR(tariffUrl, swrTariffWithOfflineCache, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000
  });
  const tariffContext: TariffContext = tariffRes?.data ?? DEFAULT_TARIFF_CONTEXT;
  const effectiveTariffContext = useMemo(
    () =>
      applyTariffCategoryOverride(tariffContext, {
        state: stateQuery,
        discom: discomQuery,
        tariffCategory: manual.tariffCategory || latestBill?.tariff_category || additionalBills[0]?.tariff_category || "",
        connectedLoadKw: connectedLoadKw ?? undefined,
        areaProfile,
        billMonth: latestBill?.bill_month || additionalBills[0]?.bill_month || undefined
      }),
    [tariffContext, stateQuery, discomQuery, manual.tariffCategory, latestBill, additionalBills, connectedLoadKw, areaProfile]
  );

  const { data: discomsRes } = useSWR(discomsUrl, swrDiscomsWithOfflineCache, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000
  });
  const discomOptions = discomsRes?.data ?? [];

  const {
    data: customersData,
    isLoading: isCustomersSwrLoading
  } = useSWR(CUSTOMERS_SWR_KEY, fetchCustomersLoose, {
    revalidateOnFocus: false,
    dedupingInterval: 25_000,
    keepPreviousData: true
  });
  const customers: CustomerLead[] = customersData ?? [];
  const isCustomersLoading = isCustomersSwrLoading && customersData === undefined;

  /**
   * Deep-link auto-select: `/proposal?leadId=<id>` lands here from the CRM
   * "Send proposal" CTA. Declared here so `customers` is in scope (it is a
   * `const` derived from SWR data above â€” referencing it earlier causes a
   * TypeScript "used before declaration" error).
   */
  const deepLinkLeadIdRef = useRef<string | null>(null);
  /** Until CRM pick applies, keeps `leadId` from URL so `/api/calculations` can load saved bill/calc. */
  const [urlLeadIdForRestore, setUrlLeadIdForRestore] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("leadId")?.trim();
    if (id) {
      deepLinkLeadIdRef.current = id;
      setUrlLeadIdForRestore(id);
    }
  }, []);
  useEffect(() => {
    const id = deepLinkLeadIdRef.current;
    if (!id || selectedLeadId || !customers.length) return;
    const lead = customers.find((c) => c.id === id);
    if (!lead) return;
    setSelectedLeadId(id);
    applyLeadFromCrm(lead);
    deepLinkLeadIdRef.current = null;
    setUrlLeadIdForRestore("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("leadId");
      window.history.replaceState({}, "", url.toString());
    }
    // applyLeadFromCrm is stable (reads only state setters); customers + selectedLeadId
    // are the real reactive dependencies here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, selectedLeadId]);
  const restoreLeadKey = (selectedLeadId || urlLeadIdForRestore).trim();
  const restoreUrl =
    clientRef.length > 0 || restoreLeadKey.length > 0
      ? (() => {
          const p = new URLSearchParams();
          if (clientRef.length > 0) p.set("clientRef", clientRef);
          if (restoreLeadKey.length > 0) p.set("leadId", restoreLeadKey);
          return `/api/calculations?${p.toString()}`;
        })()
      : null;
  const { data: restoreRes } = useSWR(restoreUrl, async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: PersistenceSnapshotResponse };
    if (!json.ok) return null;
    return json.data ?? null;
  });

  const result = useMemo(
    () =>
      calculateSolar(monthlyUnits, effectiveTariffContext, {
        stateForSizing,
        discom: discomQuery,
        connectedLoadKw: connectedLoadKw ?? undefined,
        areaProfile,
        billMonth: latestBill?.bill_month || additionalBills[0]?.bill_month || undefined
      }),
    [monthlyUnits, effectiveTariffContext, stateForSizing, discomQuery, connectedLoadKw, areaProfile, latestBill?.bill_month, additionalBills]
  );
  const effectiveResult = useMemo(() => {
    const kwRaw = parseFloat(overrideSolarKw);
    const solarKw = kwRaw > 0 ? Math.round(kwRaw * 10) / 10 : result.solarKw;
    const panelsRaw = parseInt(overridePanels);
    const panels = panelsRaw > 0 ? panelsRaw : Math.ceil((solarKw * 1000) / 540);
    const annualGeneration = Math.round(solarKw * 1500);
    const selfUse = Math.min(annualGeneration, result.annualUnits);
    const monthlySavings = Math.round((result.currentMonthlyBill * (selfUse / Math.max(result.annualUnits, 1))) * 0.9);
    const annualSavings = monthlySavings * 12;
    const grossCost = computeGrossSystemCostInr(solarKw);
    const centralSubsidy = solarKw <= 2 ? Math.round(solarKw * 30000) : Math.min(78000, Math.round(60000 + (solarKw - 2) * 18000));
    const netCost = Math.max(0, grossCost - centralSubsidy);
    const paybackYears = annualSavings > 0 ? Number((netCost / annualSavings).toFixed(1)) : 0;
    const savings25yr = annualSavings * 25;
    const profit25yr = savings25yr - netCost;
    return {
      ...result,
      solarKw,
      panels,
      annualGeneration,
      annualSavings,
      monthlySavings,
      newMonthlyBill: Math.max(0, result.currentMonthlyBill - monthlySavings),
      grossCost,
      centralSubsidy,
      netCost,
      paybackYears,
      paybackDisplay: `${paybackYears} years`,
      savings25yr,
      profit25yr
    };
  }, [overrideSolarKw, overridePanels, result]);

  const autoPanelCount = useMemo(() => {
    const kwRaw = parseFloat(overrideSolarKw);
    const solarKw = kwRaw > 0 ? kwRaw : result.solarKw;
    return Math.ceil((solarKw * 1000) / 540);
  }, [overrideSolarKw, result.solarKw]);

  const filledMonths = useMemo(() => countFilledMonths(monthlyUnits), [monthlyUnits]);
  const annualUnits = useMemo(
    () =>
      (["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const).reduce(
        (s, k) => s + (monthlyUnits[k] || 0),
        0
      ),
    [monthlyUnits]
  );

  const leadSelected = Boolean(selectedLeadId);
  const activeLead = useMemo(
    () => customers.find((c) => c.id === selectedLeadId) ?? null,
    [customers, selectedLeadId]
  );

  // Reactive bill-backed status for live preview
  const isBillBackedLive = latestBill != null;

  // â”€â”€ Builder stage progress tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Drives BuilderStageBar active/completed state in real-time.
  const osActiveStageIndex = useMemo(() => {
    const hasClient = Boolean(manual.leadContactName || manual.officialBillName || selectedLeadId);
    const hasEnergy = isBillBackedLive || Object.values(monthlyUnits).some((v) => v > 0);
    const hasSystem = effectiveResult.solarKw > 0;
    if (!hasClient) return 0;
    if (!hasEnergy) return 1;
    if (!hasSystem) return 2;
    return 3;
  }, [manual.leadContactName, manual.officialBillName, selectedLeadId, isBillBackedLive, monthlyUnits, effectiveResult.solarKw]);

  const osCompletedStages = useMemo(() => {
    const stages: number[] = [];
    const hasClient = Boolean(manual.leadContactName || manual.officialBillName || selectedLeadId);
    const hasEnergy = isBillBackedLive || Object.values(monthlyUnits).some((v) => v > 0);
    const hasSystem = effectiveResult.solarKw > 0;
    if (hasClient) stages.push(0);
    if (hasEnergy) stages.push(1);
    if (hasSystem) stages.push(2);
    return stages;
  }, [manual.leadContactName, manual.officialBillName, selectedLeadId, isBillBackedLive, monthlyUnits, effectiveResult.solarKw]);

  useEffect(() => {
    setAdditionalBills((prev) => {
      if (prev.length === requiredSecondaryCount) return prev;
      if (prev.length > requiredSecondaryCount) return prev.slice(0, requiredSecondaryCount);
      return [...prev, ...Array.from({ length: requiredSecondaryCount - prev.length }, () => null)];
    });
    setIsAnalyzingAdditional((prev) => {
      if (prev.length === requiredSecondaryCount) return prev;
      if (prev.length > requiredSecondaryCount) return prev.slice(0, requiredSecondaryCount);
      return [...prev, ...Array.from({ length: requiredSecondaryCount - prev.length }, () => false)];
    });
  }, [requiredSecondaryCount]);

  useEffect(() => {
    if (bootFromReload) {
      setHydratedFromServer(true);
      return;
    }
    if (!restoreRes || hydratedFromServer) return;
    const calc = restoreRes.latestCalculation;
    const bill = restoreRes.latestBillUpload;
    const hasServerPayload = Boolean(calc || bill);
    if (!hasServerPayload) {
      setHydratedFromServer(true);
      return;
    }

    // If sessionStorage already had a snapshot, session data takes priority â€”
    // skip server overwrite to prevent stale server data clobbering fresher local state.
    if (sessionSnap) {
      setHydratedFromServer(true);
      return;
    }

    if (calc?.monthlyUnits) {
      setMonthlyUnits((prev) => {
        const hasCurrentData = countFilledMonths(prev) > 0;
        if (hasCurrentData) return prev;
        return mergeParsedMonthsIntoUnits(emptyMonthlyUnits(), calc.monthlyUnits ?? undefined);
      });
    } else if (bill?.monthlyUnits) {
      setMonthlyUnits((prev) => {
        const hasCurrentData = countFilledMonths(prev) > 0;
        if (hasCurrentData) return prev;
        return mergeParsedMonthsIntoUnits(emptyMonthlyUnits(), bill.monthlyUnits ?? undefined);
      });
    }

    if (calc?.manualSnapshot) {
      // Merge only empty fields â€” never overwrite data the user has already typed.
      setManual((prev) => {
        const snap = calc.manualSnapshot as Partial<ManualProposalCustomer>;
        const merged: ManualProposalCustomer = { ...prev };
        for (const key of Object.keys(snap) as (keyof ManualProposalCustomer)[]) {
          if (!merged[key] && snap[key]) (merged as Record<string, string>)[key] = snap[key] as string;
        }
        return merged;
      });
    }
    if (calc?.latestBill) setLatestBill((prev) => prev ?? calc.latestBill ?? null);
    else if (bill?.parsedBill) setLatestBill((prev) => prev ?? bill.parsedBill ?? null);
    const billToAdd = calc?.previousBill;
    if (billToAdd) {
      setAdditionalBills((prev) => {
        if (prev.length === 0) return [billToAdd];
        const next = [...prev];
        if (!next[0]) next[0] = billToAdd;
        return next;
      });
    }

    if (!billAnalysis) {
      setBillAnalysis(t("proposal_billAutofillDone"));
    }
    setHydratedFromServer(true);
  }, [restoreRes, hydratedFromServer, billAnalysis, t, sessionSnap, bootFromReload]);

  useEffect(() => {
    if (!clientRef) return;
    if (filledMonths === 0 && !latestBill && additionalBills.every((b) => !b)) return;

    const payload = {
      clientRef,
      leadId: selectedLeadId || undefined,
      monthlyUnits,
      result,
      stateForSizing: stateForSizing || undefined,
      discom: manual.discom.trim() || undefined,
      tariffLabel: `${effectiveTariffContext.discomLabel} â€¢ ${effectiveTariffContext.source}`,
      manualSnapshot: manualSnapshot(manual),
      latestBill,
      previousBill: additionalBills[0] ?? null
    };
    const signature = JSON.stringify(payload);
    if (signature === lastCalcPersistSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      void fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(() => {
        lastCalcPersistSignatureRef.current = signature;
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [clientRef, filledMonths, latestBill, additionalBills, manual, monthlyUnits, result, selectedLeadId, stateForSizing, effectiveTariffContext]);

  function setSlotBusy(slot: "latest" | number, busy: boolean) {
    if (slot === "latest") {
      setIsAnalyzingLatest(busy);
      return;
    }
    setIsAnalyzingAdditional((prev) => {
      const next = [...prev];
      next[slot] = busy;
      return next;
    });
  }

  async function processBillUploadTask(task: UploadTask) {
    const { file, slot } = task;
    setScanTimingBadge("Scanning...");
    toast.info("Processing bill", "SOL.52 is reading and calibrating this bill in background.");
    const isFirstLatestUpload = slot === "latest" && !latestBill;
    setSlotBusy(slot, true);
    try {
      const base64Data = await fileToBase64(file);
      const mimeType =
        file.type ||
        (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const response = await fetch("/api/analyze-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          mimeType,
          discomCode: manual.discom.trim() || installerDiscom.trim() || undefined,
          clientRef: clientRef || undefined,
          leadId: selectedLeadId || undefined
        })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "Bill analysis failed");
      const scannerMode = payload.scannerMode as "anthropic" | "fallback_manual" | "local_pdf" | undefined;
      const learningGuardActive = Boolean(payload.learningGuardAlert);
      const aiModelTier = payload.aiModelTier as "haiku" | "sonnet" | "fallback" | undefined;
      const scanDurationMs = Number(payload.scanDurationMs ?? 0);
      const analysisMessages = [
        payload.learningUpdateInfo?.message,
        payload.tariffCycleInfo?.message,
        payload.tariffAlert?.message,
        payload.discoveryAlert?.message,
        payload.parseQualityAlert?.message,
        payload.calibrationAlert?.message,
        payload.learningGuardAlert?.message,
        payload.aiFallbackAlert?.message
      ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
      const canUseScannerAutofill = scannerMode !== "fallback_manual";
      const modelLabel =
        scannerMode === "anthropic"
          ? aiModelTier === "sonnet"
            ? "Claude Sonnet"
            : "Claude Haiku"
          : scannerMode === "local_pdf"
            ? "Local PDF Parser"
            : "Manual Verify";
      const seconds = scanDurationMs > 0 ? (scanDurationMs / 1000).toFixed(1) : null;
      setScanTimingBadge(seconds ? `${modelLabel} â€¢ ${seconds}s` : modelLabel);
      if (analysisMessages.length > 0) {
        const joined = analysisMessages.join(" ");
        const withScannerNote =
          scannerMode === "local_pdf"
            ? `${modelLabel} scan complete. ${joined}`
            : canUseScannerAutofill
              ? `${modelLabel} scan complete. ${joined}`
              : `AI scan issue. ${joined}`;
        setBillAnalysis(withScannerNote);
        setBillAnalysisTone(scannerMode === "fallback_manual" ? "warning" : "neutral");
      }

      const data = payload.data as ParsedBillShape;
      // Build parsedUnits with smart priority:
      //   1. History fills histBase (from consumption_history â€” most reliable for past months).
      //   2. data.months: only the CURRENT bill month overwrites; other months only fill empties.
      const histUnits = buildUnitsFromConsumptionHistory(data);
      const histBase = emptyMonthlyUnits();
      for (const k of MONTH_KEYS) { if (histUnits[k]) histBase[k] = histUnits[k] as number; }
      const billCurrentKey = monthKeyFromBillLabel(data.bill_month); // e.g. "apr" for APR-2026
      const parsedUnits = (() => {
        const out = { ...histBase };
        if (data.months) {
          for (const k of MONTH_KEYS) {
            const raw = data.months[k];
            if (raw == null) continue;
            const v = typeof raw === "number" ? raw : parseInt(String(raw).replace(/[^\d]/g, ""), 10);
            if (!Number.isFinite(v) || v <= 0) continue;
            if (k === billCurrentKey || !out[k]) out[k] = Math.round(v);
          }
        }
        return out as typeof histBase;
      })();
      const parsedMonthCount = countFilledMonths(parsedUnits);
      const missingMonthHint =
        parsedMonthCount < 4
          ? `Only ${parsedMonthCount} month(s) detected. Please verify missing months manually for accurate proposal.`
          : "";
      if (slot === "latest") {
        setLatestBill(data);
        const inferred = learningGuardActive ? null : inferProfileFromBill(data);
        if (inferred && data.state?.trim() && data.discom?.trim()) {
          const key = profileKey(data.state, data.discom);
          setLearnedBillProfiles((prev) => ({ ...prev, [key]: inferred }));
        }
      } else {
        setAdditionalBills((prev) => {
          const next = [...prev];
          next[slot] = data;
          return next;
        });
      }

      const parsedMonthKey = monthKeyFromBillLabel(data.bill_month);
      const parsedMonthTotal =
        numericBillAmount(data.current_month_bill_amount_inr) ?? numericBillAmount(data.total_amount_payable_inr);
      if (parsedMonthKey && parsedMonthTotal != null && parsedMonthTotal > 0) {
        setAuditedMonthTotals((prev) => ({ ...prev, [parsedMonthKey]: parsedMonthTotal }));
      }

      setManual((prev) => ({
        ...prev,
        officialBillName: prev.officialBillName || data.name || "",
        city: prev.city || data.district || "",
        discom: prev.discom || data.discom || "",
        state: prev.state || data.state || "",
        consumerId: prev.consumerId || data.consumer_id || "",
        meterNumber: prev.meterNumber || data.meter_number || "",
        connectionDate: prev.connectionDate || data.connection_date || "",
        phase: prev.phase || normalizeBillPhaseLabel(data.phase) || "",
        billPhone: prev.billPhone || data.registered_mobile || "",
        connectionType: prev.connectionType || truncateConnectionType(data.connection_type || ""),
        sanctionedLoad: (() => {
          const keep = prev.sanctionedLoad.trim();
          if (keep) return prev.sanctionedLoad;
          const printed = data.sanctioned_load?.trim();
          if (printed) return printed;
          const kw = inferMpLv12SanctionedLoadKwWhenBillOmits({
            sanctioned_load: "",
            state: data.state,
            discom: data.discom,
            connection_type: data.connection_type,
            purpose_of_supply: data.purpose_of_supply ?? undefined,
            phase: data.phase,
            tariff_category: data.tariff_category
          });
          return kw != null ? `${kw} kW` : "";
        })(),
        billingAddress: prev.billingAddress || data.address || "",
        tariffCategory: prev.tariffCategory || data.tariff_category || "",
        purposeOfSupply:
          prev.purposeOfSupply ||
          (typeof data.purpose_of_supply === "string" ? data.purpose_of_supply : "") ||
          data.connection_type ||
          "",
        contractDemandKva:
          prev.contractDemandKva ||
          (data.contract_demand_kva != null ? String(data.contract_demand_kva).trim() : "")
      }));

      setMonthlyUnits((prev) => {
        const base = slot === "latest" ? emptyMonthlyUnits() : prev;
        // History fills first (lower priority) â€” only for empty slots.
        const histU = buildUnitsFromConsumptionHistory(data);
        for (const k of MONTH_KEYS) { if (histU[k] && !base[k]) base[k] = histU[k] as number; }

        // Smart merge from data.months:
        //   â€¢ Current bill month key â†’ always trust the AI/safety-net metered value.
        //   â€¢ All other months (history) â†’ only fill if slot is STILL EMPTY.
        //     This prevents the AI from overwriting a history-derived correct value
        //     with a neighbouring-month value it confused (e.g., putting DEC's 194
        //     into the NOV slot when processing the DEC-2025 bill).
        const currentKey = parsedMonthKey; // e.g. "dec" for bill_month="DEC-2025"
        const merged = { ...base };
        if (data.months) {
          for (const k of MONTH_KEYS) {
            const raw = data.months[k];
            if (raw == null) continue;
            const v = typeof raw === "number" ? raw : parseInt(String(raw).replace(/[^\d]/g, ""), 10);
            if (!Number.isFinite(v) || v <= 0) continue;
            // For the current bill month: always override (metered reading is authoritative).
            // For history months: only fill slots that are empty (history takes priority).
            if (k === currentKey || !merged[k]) merged[k] = Math.round(v);
          }
        }
        if (slot !== "latest") return merged;
        const hasUsableHistoryWindow = (data.consumption_history?.length ?? 0) >= 4;
        // If bill already has a proper month-history table, never synthesize seasonal
        // fallback units (it causes misleading tiny values on smart/assessment bills).
        const shouldInjectFallback = !hasUsableHistoryWindow && (isFirstLatestUpload || countFilledMonths(merged) < 4);
        if (!shouldInjectFallback) return merged;
        const sixMonthAutofill = buildSixMonthAutofill(data);
        const next = { ...merged };
        // Fill only empty months; never overwrite already parsed/uploaded values.
        for (const key of MONTH_KEYS) {
          const current = Number(next[key] || 0);
          const fallback = Number(sixMonthAutofill[key] || 0);
          if (current <= 0 && fallback > 0) next[key] = fallback;
        }
        return next;
      });
      if (analysisMessages.length === 0) {
        if (scannerMode === "local_pdf") {
          setBillAnalysis(
            `${modelLabel} scan complete. ${missingMonthHint}`.trim()
          );
          setBillAnalysisTone("warning");
        } else if (canUseScannerAutofill) {
          setBillAnalysis(`${modelLabel} scan complete. ${missingMonthHint}`.trim());
          setBillAnalysisTone("success");
        } else {
          setBillAnalysis("Upload saved in manual mode. Please verify monthly units before continuing.");
          setBillAnalysisTone("warning");
        }
      } else if (canUseScannerAutofill) {
        const extraHint = missingMonthHint ? ` ${missingMonthHint}` : "";
        setBillAnalysis((prev) => `${prev}${extraHint}`.trim());
        setBillAnalysisTone("success");
      }
      toast.success("Bill analyzed", `${modelLabel} updated bill details.`);
    } catch (error) {
      setScanTimingBadge("");
      setBillAnalysis(error instanceof Error ? error.message : t("proposal_errorAnalyze"));
      setBillAnalysisTone("error");
      toast.error("Bill analysis failed", error instanceof Error ? error.message : t("proposal_errorAnalyze"));
    } finally {
      setSlotBusy(slot, false);
    }
  }

  async function runUploadQueue() {
    if (uploadWorkerRunningRef.current) return;
    uploadWorkerRunningRef.current = true;
    try {
      while (uploadQueueRef.current.length > 0) {
        const next = uploadQueueRef.current.shift();
        if (!next) continue;
        await processBillUploadTask(next);
      }
    } finally {
      uploadWorkerRunningRef.current = false;
      if (uploadQueueRef.current.length > 0) {
        void runUploadQueue();
      }
    }
  }

  function onBillUpload(file: File | null, slot: "latest" | number) {
    if (!file) return;
    // Keep only the latest queued upload for each slot.
    uploadQueueRef.current = uploadQueueRef.current.filter((task) => task.slot !== slot);
    uploadQueueRef.current.push({
      slot,
      file
    });
    setSlotBusy(slot, true);
    if (uploadWorkerRunningRef.current) {
      setScanTimingBadge("Queued...");
    }
    void runUploadQueue();
  }

  function onMonthChange(key: keyof MonthlyUnits, value: string) {
    const n = parseInt(value || "0", 10);
    setMonthlyUnits((prev) => ({ ...prev, [key]: Number.isNaN(n) ? 0 : Math.max(0, n) }));
  }

  function resetProposalForm() {
    uploadQueueRef.current = [];
    uploadWorkerRunningRef.current = false;
    setSelectedLeadId("");
    setMonthlyUnits(emptyMonthlyUnits());
    setLatestBill(null);
    setAdditionalBills(Array.from({ length: requiredSecondaryCount }, () => null));
    setAuditedMonthTotals({});
    setBillAnalysis("");
    setBillAnalysisTone("neutral");
    setScanTimingBadge("");
    setLatestWebProposalUrl(null);
    setOverrideSolarKw("");
    setOverridePanels("");
    setShowProposalSettings(false);
    setManual({
      leadContactName: "",
      leadPhone: "",
      billPhone: "",
      officialBillName: "",
      city: "",
      discom: "",
      state: "",
      consumerId: "",
      meterNumber: "",
      connectionDate: "",
      phase: "",
      connectionType: "",
      sanctionedLoad: "",
      billingAddress: "",
      tariffCategory: "",
      purposeOfSupply: "",
      contractDemandKva: ""
    });
    try {
      sessionStorage.removeItem(SESSION_STATE_KEY);
    } catch {
      /* ignore */
    }
  }

  function applyLeadFromCrm(lead: CustomerLead) {
    setAuditedMonthTotals({});
    setManual((prev) => ({
      ...prev,
      leadContactName: lead.name,
      leadPhone: lead.phone ?? "",
      officialBillName: "",
      city: lead.city,
      discom: lead.discom,
      purposeOfSupply: "",
      contractDemandKva: ""
    }));
    const seedCtx = getFallbackTariffContext(installerState, lead.discom);
    const monthlyKwh = estimateMonthlyKwhFromBillAmount(lead.monthly_bill, seedCtx);
    const perMonth = Math.max(0, Math.round(monthlyKwh));
    const next = emptyMonthlyUnits();
    (Object.keys(next) as (keyof MonthlyUnits)[]).forEach((k) => {
      next[k] = perMonth;
    });
    setMonthlyUnits(next);
    setBillAnalysis("");
    setBillAnalysisTone("neutral");
  }

  /**
   * CRM v2: every generated proposal is tied to a lead. Existing CRM picks pass
   * through; walk-ins get a lead row on first generate (Customers + pipeline).
   */
  function syncCrmCachesAfterProposal(leadId: string) {
    const proposalPhone = pickProposalLeadPhone(manual.leadPhone, manual.billPhone);
    if (proposalPhone) void patchLeadPhoneIfProvided(leadId, proposalPhone);
    void mutateGlobal(PIPELINE_SWR_KEY);
    void mutateGlobal(CUSTOMERS_SWR_KEY, undefined, { revalidate: true });
    void mutateGlobal(DASHBOARD_STATS_SWR_KEY);
  }

  async function ensureLeadIdForProposal(): Promise<{ leadId: string; created: boolean }> {
    if (selectedLeadId) {
      return { leadId: selectedLeadId, created: false };
    }
    const merged = mergeCustomerForProposal(manual, latestBill || previousBill);
    const customerName =
      merged?.name?.trim() || manual.officialBillName.trim() || manual.leadContactName.trim();
    if (!customerName) {
      throw new Error(t("proposal_needCustomerName"));
    }
    const proposalPhone = pickProposalLeadPhone(manual.leadPhone, manual.billPhone);
    const createLeadResp = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customerName,
        city: manual.city.trim() || "Unknown",
        state: manual.state.trim() || undefined,
        discom: manual.discom.trim() || installerDiscom || "Unknown",
        monthly_bill: Math.max(0, Math.round(effectiveResult.currentMonthlyBill || 0)),
        phone: proposalPhone || undefined,
        status: "new"
      })
    });
    if (!createLeadResp.ok) {
      const j = (await createLeadResp.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || "Could not create lead in Customers");
    }
    const j = (await createLeadResp.json()) as { data?: { id?: string } };
    const leadId = j.data?.id ?? "";
    if (!leadId) throw new Error("Lead create response missing id");
    setSelectedLeadId(leadId);
    setLastAutoLeadId(leadId);
    return { leadId, created: true };
  }

  function buildProposalExtrasPayload() {
    const branding = readProposalBrandingSettings();
    const installerContactLine = formatInstallerContactLine(branding.installerContact, branding.installerEmail);
    const sanctionedLoadKw = (() => {
      const s = manual.sanctionedLoad?.trim();
      if (s) {
        const num = Number(s.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(num) && num > 0) return num;
      }
      const ref = latestBill ?? previousBill;
      return (
        inferMpLv12SanctionedLoadKwWhenBillOmits({
          sanctioned_load: ref?.sanctioned_load,
          state: manual.state || ref?.state,
          discom: manual.discom || ref?.discom,
          connection_type: manual.connectionType || ref?.connection_type,
          purpose_of_supply: manual.purposeOfSupply || ref?.purpose_of_supply,
          phase: manual.phase || ref?.phase,
          tariff_category: manual.tariffCategory || ref?.tariff_category
        }) ?? undefined
      );
    })();
    const siteImages = (branding.proposalSiteImages ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 6);
    return {
      lang: proposalLang,
      amcSelectedYears: branding.amcSelectedYears,
      financeOption: { interestRatePct: financeRatePct, tenuresYears: [3, 5, 7] as number[] },
      installerName: branding.installerName.trim() || undefined,
      installerContact: installerContactLine,
      customerProfile: {
        consumerId: manual.consumerId || undefined,
        meterNumber: manual.meterNumber || undefined,
        connectionDate: manual.connectionDate || undefined,
        connectionType: manual.connectionType || undefined,
        phase: manual.phase || undefined,
        sanctionedLoadKw
      },
      bankDetails: {
        accountName: branding.bankAccountName.trim() || undefined,
        accountNumber: branding.bankAccountNumber.trim() || undefined,
        ifsc: branding.bankIfsc.trim() || undefined,
        branch: branding.bankBranch.trim() || undefined,
        upiId: branding.bankUpiId.trim() || undefined,
        paymentQrCodeUrl: branding.paymentQrCodeUrl.trim() || undefined
      },
      siteImages: siteImages.length > 0 ? siteImages : undefined,
      installerLogoUrl: branding.installerLogoUrl.trim() || undefined,
      companyProfile: {
        gstNumber: branding.companyGstNumber.trim() || undefined
      },
      proposalLayout:
        osPresetId === "commercial_executive" && proposalLayout
          ? applyCommercialFlagsToLayout(proposalLayout, commercialConfig ?? {})
          : proposalLayout ?? undefined,
      commercialConfig:
        osPresetId === "commercial_executive" ? commercialConfig ?? undefined : undefined,
      storyMode: urlPrefill.story ?? commercialConfig?.storyMode,
      storySegment: commercialConfig?.orgType ?? urlPrefill.orgType,
    };
  }

  useEffect(() => {
    if (osPresetId !== "commercial_executive") return;
    const kw = effectiveResult?.solarKw ?? urlPrefill.kw ?? 60;
    setCommercialConfig((prev) =>
      prev ?? withOrgStory(defaultCommercialConfig(kw), urlPrefill.orgType, urlPrefill.story)
    );
    setProposalLayout((prev) => prev ?? getPresetDefaultLayout("commercial_executive"));
  }, [osPresetId, effectiveResult?.solarKw, urlPrefill.kw, urlPrefill.orgType, urlPrefill.story]);

  async function downloadPremiumPpt() {
    setIsPptDownloading(true);
    try {
      const merged = mergeCustomerForProposal(manual, latestBill || previousBill);
      const customerName = merged?.name?.trim() || manual.officialBillName || manual.leadContactName || "Customer";
      const location = [merged?.district || manual.city, merged?.state || manual.state].filter(Boolean).join(", ");
      const uploadedBills = [latestBill, ...additionalBills];
      const monthlyBillActuals = buildMonthlyBillActualsFromBills(uploadedBills, auditedMonthTotals);
      const monthlyAuditOverrides = buildMonthlyAuditOverridesFromBills(uploadedBills);
      const response = await fetch("/api/proposal-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          location,
          systemKw: effectiveResult.solarKw,
          yearlyBill: effectiveResult.currentMonthlyBill * 12,
          afterSolar: effectiveResult.newMonthlyBill * 12,
          saving: effectiveResult.annualSavings,
          paybackYears: effectiveResult.paybackYears,
          monthlyUnits,
          state: manual.state || latestBill?.state || previousBill?.state || installerState || "Madhya Pradesh",
          discom: manual.discom || latestBill?.discom || previousBill?.discom || installerDiscom || "MPPKVVCL",
          connectionType: manual.connectionType || latestBill?.connection_type || previousBill?.connection_type || "",
          tariffCategory: manual.tariffCategory || latestBill?.tariff_category || previousBill?.tariff_category || "",
          connectedLoadKw: connectedLoadKw ?? undefined,
          areaProfile,
          billMonth: latestBill?.bill_month || previousBill?.bill_month || undefined,
          currentMonthBillAmountInr:
            latestBill?.current_month_bill_amount_inr ??
            previousBill?.current_month_bill_amount_inr ??
            null,
          monthlyBillActuals,
          monthlyAuditOverrides,
          ...buildMpSmartBillingApiPayload(manual, latestBill, previousBill),
          grossSystemCostInr: effectiveResult.grossCost,
          pmSuryaGharSubsidyInr: effectiveResult.centralSubsidy,
          netCostInr: effectiveResult.netCost,
          ...buildProposalExtrasPayload()
        })
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "PPT download failed");
      }
      const blob = await response.blob();
      const fileName = `${customerName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "customer"}-premium-proposal.pptx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setBillAnalysis(error instanceof Error ? error.message : "Premium PPT download failed");
    } finally {
      setIsPptDownloading(false);
    }
  }

  async function copyWhatsAppSummary() {
    setIsCopyingSummary(true);
    try {
      const customer = manual.officialBillName || manual.leadContactName || "Customer";
      const text = [
        `SOL.52 Solar Snapshot`,
        `Customer: ${customer}`,
        `System size: ${effectiveResult.solarKw} kW`,
        `Net investment: â‚¹${effectiveResult.netCost.toLocaleString("en-IN")}`,
        `Annual saving: â‚¹${effectiveResult.annualSavings.toLocaleString("en-IN")}`,
        `Payback: ${effectiveResult.paybackDisplay}`,
        `25Y profit estimate: â‚¹${effectiveResult.profit25yr.toLocaleString("en-IN")}`
      ].join("\n");
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied", "WhatsApp-ready proposal summary copied.");
    } catch (error) {
      toast.error("Copy failed", error instanceof Error ? error.message : "Clipboard not available.");
    } finally {
      setIsCopyingSummary(false);
    }
  }

  async function generateWebProposal() {
    setIsWebProposalBusy(true);
    setLastAutoLeadId(null);
    try {
      const { leadId, created: leadCreated } = await ensureLeadIdForProposal();
      const merged = mergeCustomerForProposal(manual, latestBill || previousBill);
      const customerName = merged?.name?.trim() || manual.officialBillName || manual.leadContactName || "Customer";
      const location = [merged?.district || manual.city, merged?.state || manual.state].filter(Boolean).join(", ");
      const uploadedBills = [latestBill, ...additionalBills];
      const monthlyBillActuals = buildMonthlyBillActualsFromBills(uploadedBills, auditedMonthTotals);
      const monthlyAuditOverrides = buildMonthlyAuditOverridesFromBills(uploadedBills);
      const billBacked = isBillBackedFromBuilderState({
        latestBill,
        previousBill,
        additionalBills,
        monthlyUnits,
        auditedMonthTotals,
        monthlyBillActuals
      });
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          location,
          systemKw: effectiveResult.solarKw,
          yearlyBill: effectiveResult.currentMonthlyBill * 12,
          afterSolar: effectiveResult.newMonthlyBill * 12,
          saving: effectiveResult.annualSavings,
          paybackYears: effectiveResult.paybackYears,
          monthlyUnits,
          state: manual.state || latestBill?.state || previousBill?.state || installerState || "Madhya Pradesh",
          discom: manual.discom || latestBill?.discom || previousBill?.discom || installerDiscom || "MPPKVVCL",
          connectionType: manual.connectionType || latestBill?.connection_type || previousBill?.connection_type || "",
          tariffCategory: manual.tariffCategory || latestBill?.tariff_category || previousBill?.tariff_category || "",
          connectedLoadKw: connectedLoadKw ?? undefined,
          areaProfile,
          billMonth: latestBill?.bill_month || previousBill?.bill_month || undefined,
          currentMonthBillAmountInr:
            latestBill?.current_month_bill_amount_inr ??
            previousBill?.current_month_bill_amount_inr ??
            null,
          monthlyBillActuals,
          monthlyAuditOverrides,
          clientRef: clientRef || undefined,
          leadId,
          ...buildMpSmartBillingApiPayload(manual, latestBill, previousBill),
          grossSystemCostInr: effectiveResult.grossCost,
          pmSuryaGharSubsidyInr: effectiveResult.centralSubsidy,
          netCostInr: effectiveResult.netCost,
          panels: effectiveResult.panels,
          dataSource: billBacked ? "bill" : "requirement",
          presetId: osPresetId ?? "residential_smart",
          ...buildProposalExtrasPayload()
        })
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "Web proposal failed");
      }
      const json = (await response.json()) as { ok: boolean; id?: string; shareUrl?: string; persisted?: boolean };
      if (!json.ok) throw new Error("Web proposal could not be created");
      if (json.persisted === false) {
        toast.error("Save failed", t("proposal_persistFailed"));
        return;
      }
      const shareUrl = json.shareUrl || (json.id ? `${window.location.origin}/proposal/${json.id}` : null);
      if (!shareUrl) throw new Error("No share URL returned");
      setLatestWebProposalUrl(shareUrl);
      syncCrmCachesAfterProposal(leadId);
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(
          "Web proposal ready",
          leadCreated ? t("proposal_leadCreatedSub") : "Share link copied â€” paste on WhatsApp."
        );
      } catch {
        toast.success(
          "Web proposal ready",
          leadCreated ? t("proposal_leadCreatedSub") : "Share link saved below."
        );
      }
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Web proposal failed", error instanceof Error ? error.message : "Could not generate web proposal.");
    } finally {
      setIsWebProposalBusy(false);
    }
  }

  function shareLatestOnWhatsApp() {
    if (!latestWebProposalUrl) return;
    const customer = manual.officialBillName || manual.leadContactName || "Customer";
    const text = [
      `Namaste ${customer} ðŸŒž`,
      ``,
      `${effectiveResult.solarKw} kW solar proposal aapke liye taiyaar hai:`,
      `â€¢ Net cost: â‚¹${effectiveResult.netCost.toLocaleString("en-IN")}`,
      `â€¢ Annual saving: â‚¹${effectiveResult.annualSavings.toLocaleString("en-IN")}`,
      `â€¢ Payback: ${effectiveResult.paybackDisplay}`,
      ``,
      `Full interactive proposal: ${latestWebProposalUrl}`
    ].join("\n");
    const phone = (manual.leadPhone || manual.billPhone || "").replace(/[^\d]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const osCustomerName = manual.leadContactName || manual.officialBillName;

  return (
    <>
      {/* Proposal OS â€” Preset Picker overlay */}
      {showPresetPicker && (
        <ProposalPresetPicker
          currentPresetId={osPresetId}
          onSelect={(id) => { setOsPresetId(id); setShowPresetPicker(false); }}
          onSkip={() => { setOsPresetId("residential_smart"); setShowPresetPicker(false); }}
        />
      )}

      {/* Block playlist drawer */}
      {showBlockPlaylist && (
        <BlockPlaylistEditor
          presetId={osPresetId}
          onClose={() => setShowBlockPlaylist(false)}
        />
      )}

      {osPresetId === "commercial_executive" && proposalLayout ? (
        <ProposalReviewSheet
          open={showReviewSheet}
          onClose={() => setShowReviewSheet(false)}
          presetId="commercial_executive"
          layout={proposalLayout}
          onLayoutChange={setProposalLayout}
        />
      ) : null}

      {/*
       * Mobile floating generate FAB â€” visible below lg when customer name is filled.
       * Sits above the bottom nav (bottom-[5.5rem] matches the nav height + safe area).
       * Hidden on lg+ since the LivePreviewPanel already has a visible generate button.
       * z-[90] â€” below shell topbar (z-100) and modals (z-10050+) but above page content.
       */}
      {osCustomerName && !showPresetPicker && !showBlockPlaylist && (
        <div className="fixed bottom-[5.5rem] right-4 z-[90] lg:hidden">
          <button
            type="button"
            disabled={isWebProposalBusy}
            onClick={() => void generateWebProposal()}
            aria-label={osPresetId === "commercial_executive" ? "Generate Commercial Proposal" : "Generate Web Proposal"}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-all active:scale-95",
              osPresetId === "commercial_executive"
                ? "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-900/20"
                : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-900/20",
              isWebProposalBusy && "opacity-70 cursor-not-allowed"
            )}
          >
            {isWebProposalBusy ? (
              <Skeleton className="h-4 w-4 rounded-full bg-white/30" />
            ) : osPresetId === "commercial_executive" ? (
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Globe className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>{isWebProposalBusy ? "Generatingâ€¦" : "Generate"}</span>
          </button>
        </div>
      )}

      <WorkspacePage tone="workflow" stagger={false}>
        {/* Proposal OS â€” branded header */}
        <ProposalOSHeader
          presetId={osPresetId}
          onChangePreset={() => setShowPresetPicker(true)}
          customerName={osCustomerName || undefined}
        />

        {/* OS layout: form (flex-1) + live preview panel (fixed width, desktop) */}
        <div className="flex items-start gap-4 lg:gap-6">
          {/* Main builder column */}
          <div className="min-w-0 flex-1">
            <BuilderStageBar
              presetId={osPresetId}
              activeStageIndex={osActiveStageIndex}
              completedStages={osCompletedStages}
            />

            {/* Commercial Executive â€” Category selector (PHASE A) */}
            {osPresetId === "commercial_executive" && commercialConfig && (
              <CommercialCategorySelector
                value={commercialConfig.orgType}
                onChange={(orgType, defaultKw) => {
                  setCommercialConfig((prev) =>
                    prev ? { ...prev, orgType } : { orgType }
                  );
                  // Seed kW only when the field is empty / default
                  if (!overrideSolarKw || parseFloat(overrideSolarKw) === (effectiveResult?.solarKw ?? 0)) {
                    setOverrideSolarKw(String(defaultKw));
                    setOverridePanels("");
                  }
                }}
                className="mb-4"
              />
            )}

            {/* â”€â”€â”€ EXISTING FORM CONTENT (unchanged) â”€â”€â”€ */}
            <div id="step-1-anchor" className={`ss-step-card space-y-2 ${osPresetId === "commercial_executive" ? "ring-1 ring-sky-200/60" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="ss-step-chip">Step 1</span>
            {osPresetId === "commercial_executive" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                <Building2 className="h-2.5 w-2.5" />
                Commercial
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={resetProposalForm}
            className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            Clear Form
          </button>
        </div>
        <FloatingLabelSelect
          label={step1Label}
          suppressHydrationWarning
          value={selectedLeadId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedLeadId(id);
            if (!id) {
              setManual((p) => ({ ...p, leadContactName: "", leadPhone: "" }));
              setBillAnalysis("");
              setBillAnalysisTone("neutral");
              return;
            }
            const lead = customers.find((c) => c.id === id);
            if (lead) applyLeadFromCrm(lead);
          }}
        >
              <option value="">
                {isCustomersLoading ? "à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ..." : " "}
              </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} â€” {c.city} ({c.discom})
            </option>
          ))}
        </FloatingLabelSelect>
        <p className="text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">{t("proposal_step1LeadHint")}</p>
        {!leadSelected ? (
          <p className="rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-[11px] font-medium leading-snug text-sky-800">
            {t("proposal_walkInCrmHint")}
          </p>
        ) : null}
      </div>

      {leadSelected && manual.leadContactName ? (
        <ProposalQuickPreview
          customerName={manual.leadContactName}
          city={activeLead?.city ?? manual.city}
          discom={activeLead?.discom ?? manual.discom}
          systemKw={effectiveResult.solarKw}
          annualSavingsInr={effectiveResult.annualSavings}
          netCostInr={effectiveResult.netCost}
          paybackLabel={effectiveResult.paybackDisplay}
          billOptionalHint={t("proposal_quickPathHint")}
          onGenerate={() => void generateWebProposal()}
          busy={isWebProposalBusy}
        />
      ) : null}

      <div id="step-2-anchor" className={`ss-step-card ${osPresetId === "commercial_executive" ? "ring-1 ring-sky-200/60" : ""}`}>
        <span className="ss-step-chip">Step 2</span>
        <h2 className="flex flex-col gap-1 text-base font-bold text-brand-900 sm:flex-row sm:items-center sm:gap-2 sm:text-lg">
          <span className="flex items-center gap-2">
            <FileUp className="h-5 w-5 shrink-0 text-brand-600" />
            <span className="leading-snug">{step2Label}</span>
          </span>
        </h2>
        <p className="mt-2 text-xs font-medium leading-snug text-slate-600 sm:text-sm">
          {t("proposal_step2BillUploadsSub")} {billingRule.averagingHint}
        </p>

        {/* Commercial mode â€” bill-based vs requirement-based selector (PHASE A) */}
        {osPresetId === "commercial_executive" && (
          <CommercialInputModeSelector
            mode={commercialInputMode}
            onModeChange={(m) => {
              setCommercialInputMode(m);
              // Reset requirement fields when switching back to bill mode
              if (m === "bill") {
                setRequirementMonthlyKwh("");
                setRequirementNotes("");
              }
            }}
            contactName={manual.leadContactName}
            orgName={manual.officialBillName}
            phone={manual.leadPhone}
            city={manual.city}
            monthlyKwh={requirementMonthlyKwh}
            notes={requirementNotes}
            onContactName={(v) => setManual((p) => ({ ...p, leadContactName: v }))}
            onOrgName={(v) => setManual((p) => ({ ...p, officialBillName: v }))}
            onPhone={(v) => setManual((p) => ({ ...p, leadPhone: v }))}
            onCity={(v) => setManual((p) => ({ ...p, city: v }))}
            onMonthlyKwh={(v) => {
              setRequirementMonthlyKwh(v);
              // Seed monthly kWh into the January unit (simple proxy for sizing engine)
              const kwhPerMonth = parseFloat(v);
              if (!isNaN(kwhPerMonth) && kwhPerMonth > 0) {
                const flat = Math.round(kwhPerMonth);
                const patch: Record<string, number> = {};
                (["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const).forEach((m) => {
                  patch[m] = flat;
                });
                setMonthlyUnits((prev) => ({ ...prev, ...patch }));
              }
            }}
            onNotes={setRequirementNotes}
          />
        )}

        {/* Bill upload area â€” hidden when commercial requirement mode is selected */}
        {!(osPresetId === "commercial_executive" && commercialInputMode === "requirement") && (
        <>
        {!leadSelected ? (
          <p className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-2 text-[11px] font-semibold leading-snug text-amber-950 sm:text-xs">
            {t("proposal_billPersistLeadHint")}
          </p>
        ) : null}
        {uploadRequirement.requiredBills > 1 ? (
          <p className="mt-1 text-[11px] font-semibold text-indigo-700 sm:text-xs">
            SOL.52 upload planner: this DISCOM currently needs {uploadRequirement.requiredBills} bills for 12-month coverage.
          </p>
        ) : (
          <p className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">
            Unknown/new format: upload latest bill first. SOL.52 will auto-learn and update required bill count.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <UploadCard
            title={billingRule.latestBillLabel}
            subtitle={t("proposal_latestSubShort")}
            busy={isAnalyzingLatest}
            parsedBill={latestBill}
            onPick={(file) => onBillUpload(file, "latest")}
          />
          {Array.from({ length: requiredSecondaryCount }, (_, idx) => {
            const targetLabel = uploadRequirement.secondaryLabels[idx] ?? `Bill ${idx + 2}`;
            const alignState = secondaryAlignment[idx];
            const mismatchHint =
              alignState && alignState.current && !alignState.aligned
                ? `Uploaded ${alignState.current} â€¢ Please match ${targetLabel}`
                : `Required â€¢ ${targetLabel}`;
            return (
              <UploadCard
                key={`secondary-card-${idx}`}
                title={targetLabel}
                subtitle={mismatchHint}
                busy={Boolean(isAnalyzingAdditional[idx])}
                parsedBill={additionalBills[idx] ?? null}
                onPick={(file) => onBillUpload(file, idx)}
              />
            );
          })}
        </div>
        <div className="mt-4 space-y-3 border-t border-brand-100/70 pt-4">
          <h3 className="text-sm font-extrabold tracking-wide text-brand-900 sm:text-base">
            {monthlyUnitsTitle}
          </h3>
          <p className="text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
            Auto-filled from first bill upload for quick verification. You can edit any month manually.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {MONTH_KEYS.map((m) => (
              <FloatingLabelInput
                key={m}
                label={m.toUpperCase()}
                type="number"
                min={0}
                value={monthlyUnits[m] || ""}
                onChange={(e) => onMonthChange(m, e.target.value)}
                className="min-h-9 py-1 text-xs sm:text-sm"
                containerClassName="rounded-lg border border-brand-100 p-1.5 sm:p-2"
              />
            ))}
          </div>
        </div>
        {!hasRequiredBillInputs && billingRule.minBillsRequired > 1 ? (
          <p className="mt-2 text-xs font-bold text-amber-700 sm:text-sm">
            SOL.52 requirement: upload {uploadRequirement.requiredBills} bills ({billingRule.latestBillLabel} + required history bills) to continue.
          </p>
        ) : null}
        {billAnalysis ? (
          <>
            {scanTimingBadge ? (
              <p className="mt-3 inline-flex rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700 sm:text-xs">
                {scanTimingBadge}
              </p>
            ) : null}
            <p
              className={cn(
                "mt-2 text-xs font-semibold leading-snug sm:text-sm",
                billAnalysisTone === "success"
                  ? "text-emerald-700"
                  : billAnalysisTone === "warning"
                    ? "text-amber-700"
                    : billAnalysisTone === "error"
                      ? "text-rose-700"
                      : "text-slate-700"
              )}
            >
              {billAnalysis}
            </p>
          </>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
          {t("proposal_annualUnitsLine", { annual: annualUnits.toLocaleString("en-IN"), filled: filledMonths })}
        </p>
        </>
        )}
        {/* END: bill upload area */}
      </div>

      {/* Bill analysis charts â€” hidden in commercial requirement mode */}
      {!(osPresetId === "commercial_executive" && commercialInputMode === "requirement") && (
        <div className="ss-card p-4 sm:p-5">
          <BillAnalysisCharts
            monthlyUnits={monthlyUnits}
            result={result}
            tariffContext={effectiveTariffContext}
            parsedBill={latestBill || previousBill}
          />
        </div>
      )}

      {/* Connection & manual fields â€” hidden in commercial requirement mode (handled by CommercialInputModeSelector) */}
      {!(osPresetId === "commercial_executive" && commercialInputMode === "requirement") && (
      <div className="ss-card space-y-3 p-4 sm:space-y-4 sm:p-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 sm:text-sm">{t("proposal_manualHeading")}</h3>
          <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">{t("proposal_manualSubCrm")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FloatingLabelInput
            label={t("proposal_officialBillNamePlaceholder")}
            containerClassName="sm:col-span-2"
            value={manual.officialBillName}
            onChange={(e) => setManual((p) => ({ ...p, officialBillName: e.target.value }))}
          />

          {!leadSelected && (
            <FloatingLabelInput
              label={t("proposal_walkInContactPlaceholder")}
              value={manual.leadContactName}
              onChange={(e) => setManual((p) => ({ ...p, leadContactName: e.target.value }))}
            />
          )}
          <FloatingLabelInput
            label="Lead / Contact Mobile No."
            value={manual.leadPhone}
            onChange={(e) => setManual((p) => ({ ...p, leadPhone: e.target.value }))}
          />
          <FloatingLabelInput
            label="Bill Registered Mobile No."
            value={manual.billPhone}
            onChange={(e) => setManual((p) => ({ ...p, billPhone: e.target.value }))}
          />

          <FloatingLabelInput
            label={`${t("customers_placeholderCity")} / district`}
            value={manual.city}
            onChange={(e) => setManual((p) => ({ ...p, city: e.target.value }))}
          />
          <FloatingLabelSelect
            label={t("proposal_statePlaceholder")}
            suppressHydrationWarning
            value={manual.state}
            onChange={(e) => setManual((p) => ({ ...p, state: e.target.value }))}
          >
            <option value="">{t("proposal_statePlaceholder")}</option>
            {INDIAN_STATES_AND_UTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FloatingLabelSelect>
          <FloatingLabelInput
            label="Consumer ID / CA number"
            value={manual.consumerId}
            onChange={(e) => setManual((p) => ({ ...p, consumerId: e.target.value }))}
          />
          <FloatingLabelInput
            label="Meter number"
            value={manual.meterNumber}
            onChange={(e) => setManual((p) => ({ ...p, meterNumber: e.target.value }))}
          />
          <FloatingLabelInput
            label="Connection date (as on bill)"
            type="text"
            value={manual.connectionDate}
            onChange={(e) => setManual((p) => ({ ...p, connectionDate: e.target.value }))}
          />
          <FloatingLabelInput
            label="Phase (as on bill, e.g. Single phase)"
            value={manual.phase}
            onChange={(e) => setManual((p) => ({ ...p, phase: e.target.value }))}
          />
          <FloatingLabelInput
            label={t("proposal_connectionPlaceholder")}
            value={manual.connectionType}
            onChange={(e) => setManual((p) => ({ ...p, connectionType: e.target.value }))}
          />
          <FloatingLabelInput
            label="Purpose of supply (as on bill, e.g. Shops/Showrooms)"
            value={manual.purposeOfSupply}
            onChange={(e) => setManual((p) => ({ ...p, purposeOfSupply: e.target.value }))}
          />
          <FloatingLabelInput
            label="Sanctioned load (e.g. 5 kW, 8.5 kVA)"
            value={manual.sanctionedLoad}
            onChange={(e) => setManual((p) => ({ ...p, sanctionedLoad: e.target.value }))}
          />
          <FloatingLabelInput
            label="Contract demand â€” kVA (if printed separately)"
            value={manual.contractDemandKva}
            onChange={(e) => setManual((p) => ({ ...p, contractDemandKva: e.target.value }))}
          />
          <FloatingLabelInput
            label="Tariff category (e.g. DS-I, BPL, Commercial)"
            value={manual.tariffCategory}
            onChange={(e) => setManual((p) => ({ ...p, tariffCategory: e.target.value }))}
          />
          <FloatingLabelInput
            label="Billing address (as on bill)"
            containerClassName="sm:col-span-2"
            value={manual.billingAddress}
            onChange={(e) => setManual((p) => ({ ...p, billingAddress: e.target.value }))}
          />
        </div>
      </div>
      )}
      {/* END: connection & manual fields */}

      {/* Bill details summary â€” hidden in commercial requirement mode */}
      {!(osPresetId === "commercial_executive" && commercialInputMode === "requirement") && (latestBill || previousBill || manual.officialBillName) && (
        <div className="ss-card space-y-2 p-4 sm:p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 sm:text-sm">{t("proposal_billDetails")}</h3>
          <div className="grid gap-1 text-xs font-semibold text-slate-800 sm:text-sm">
            {[
              [t("proposal_rowLeadContact"), manual.leadContactName || "â€”"],
              [t("proposal_rowOfficialBillName"), manual.officialBillName || latestBill?.name || previousBill?.name],
              ["Consumer ID", latestBill?.consumer_id || previousBill?.consumer_id || manual.consumerId],
              ["Meter", latestBill?.meter_number || previousBill?.meter_number || manual.meterNumber],
              ["DISCOM", latestBill?.discom || previousBill?.discom || manual.discom],
              ["State", latestBill?.state || previousBill?.state || manual.state],
              ["Latest bill month", latestBill?.bill_month],
              ["Previous bill month", previousBill?.bill_month]
            ].map(([label, val]) =>
              val ? (
                <div
                  key={String(label)}
                  className="flex flex-col gap-0.5 border-b border-brand-50 py-1.5 last:border-0 sm:flex-row sm:justify-between sm:gap-2"
                >
                  <span className="shrink-0 text-slate-600 dark:text-slate-400">{label}</span>
                  <span className="break-words text-right text-sm font-bold text-slate-900 dark:text-slate-50 sm:text-base">{String(val)}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Recommended solar card â€” hidden in commercial requirement mode */}
      {!(osPresetId === "commercial_executive" && commercialInputMode === "requirement") && (
        <div className="ss-card p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-brand-900 sm:text-lg">{t("proposal_recommended")}</h2>
          <p className="mt-2 break-words text-2xl font-extrabold tabular-nums text-solar-600 sm:text-3xl lg:text-4xl">
            â‚¹{effectiveResult.annualSavings.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">{t("proposal_annualSavingsLine")}</p>
        </div>
      )}

      <div id="step-3-anchor" className={`ss-card space-y-4 p-4 sm:p-5 ${osPresetId === "commercial_executive" ? "ring-1 ring-sky-200/60" : ""}`}>
        {osPresetId === "commercial_executive" && commercialConfig ? (
          <CommercialNarrativePanel
            config={commercialConfig}
            onChange={(next) => {
              setCommercialConfig(next);
              if (proposalLayout) {
                setProposalLayout(applyCommercialFlagsToLayout(proposalLayout, next));
              }
            }}
            onOpenReview={() => setShowReviewSheet(true)}
          />
        ) : null}

        {/* Solar System Size â€” editable */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("proposal_solarSizeLabel")}
            {overrideSolarKw && parseFloat(overrideSolarKw) !== result.solarKw && (
              <span className="ml-2 font-semibold text-indigo-500">Auto: {result.solarKw} kW</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Editable custom input â€” text mode prevents browser mangling of digits */}
            <div className="flex items-center gap-1 rounded-lg border border-brand-300 bg-white px-3 py-1.5">
              <NumericTextInput
                value={
                  overrideSolarKw !== ""
                    ? (() => {
                        const n = parseFloat(overrideSolarKw);
                        return Number.isFinite(n) ? n : undefined;
                      })()
                    : undefined
                }
                fallback={result.solarKw}
                onValueChange={(v) => {
                  setOverrideSolarKw(v !== undefined ? String(v) : "");
                  setOverridePanels("");
                }}
                className="w-20 bg-transparent text-base font-extrabold text-brand-700 outline-none"
                aria-label={t("proposal_solarSizeLabel")}
              />
              <span className="text-sm font-bold text-brand-700">kW</span>
            </div>
            {/* Preset dropdown */}
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
              value={overrideSolarKw || String(result.solarKw)}
              onChange={(e) => { setOverrideSolarKw(e.target.value); setOverridePanels(""); }}
            >
              {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 15, 17.5, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300, 400, 500].map((v) => (
                <option key={v} value={String(v)}>{v} kW</option>
              ))}
            </select>
            {overrideSolarKw && (
              <button
                type="button"
                onClick={() => { setOverrideSolarKw(""); setOverridePanels(""); }}
                className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-red-500"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Panels â€” editable */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("proposal_panelsLabel")}
            <span className="ml-2 font-normal normal-case text-slate-400">(Auto: {autoPanelCount} panels @ 540W)</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-brand-300 bg-white px-3 py-1.5">
              <NumericTextInput
                integer
                value={
                  overridePanels !== ""
                    ? (() => {
                        const n = parseInt(overridePanels, 10);
                        return Number.isFinite(n) ? n : undefined;
                      })()
                    : undefined
                }
                fallback={autoPanelCount}
                onValueChange={(v) => setOverridePanels(v !== undefined ? String(v) : "")}
                className="w-16 bg-transparent text-base font-extrabold text-brand-700 outline-none"
                aria-label={t("proposal_panelsLabel")}
              />
              <span className="text-sm font-bold text-brand-700">panels</span>
            </div>
            {overridePanels && (
              <button
                type="button"
                onClick={() => setOverridePanels("")}
                className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-red-500"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-700 sm:text-sm">
            {t("proposal_netCost")}: <span className="break-words font-extrabold text-brand-700">â‚¹{effectiveResult.netCost.toLocaleString("en-IN")}</span>
          </p>
          <p className="text-xs font-semibold text-slate-700 sm:text-sm">
            {t("proposal_payback")}: <span className="font-extrabold text-brand-700">{effectiveResult.paybackDisplay}</span>
          </p>
        </div>
        {/* Proposal language â€” inline toggle */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Language</span>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setProposalLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${proposalLang === "en" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setProposalLang("hi")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${proposalLang === "hi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              à¤¹à¤¿à¤‚à¤¦à¥€
            </button>
          </div>
        </div>

        <div id="step-4-anchor" className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {osPresetId === "commercial_executive" && proposalLayout ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              onClick={() => setShowReviewSheet(true)}
            >
              <Building2 className="h-4 w-4" />
              Review sections
              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {proposalLayout.blocks.filter((b) => b.enabled).length}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className={`ss-cta-primary sm:text-base ${osPresetId === "commercial_executive" ? "from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-700 hover:to-indigo-700" : ""}`}
            onClick={() => void generateWebProposal()}
            disabled={isWebProposalBusy}
          >
            {isWebProposalBusy ? (
              <Skeleton className="mr-2 h-4 w-4 rounded-full" />
            ) : osPresetId === "commercial_executive" ? (
              <Building2 className="mr-2 h-4 w-4" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            {osPresetId === "commercial_executive" ? "Generate Commercial Proposal" : "Generate Web Proposal"}
          </button>
          <button
            type="button"
            className="ss-cta-secondary sm:text-base"
            onClick={() => void downloadPremiumPpt()}
            disabled={isPptDownloading}
          >
            {isPptDownloading ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <Download className="mr-2 h-4 w-4" />}
            Download PPT
          </button>
          <button
            type="button"
            className="ss-cta-secondary border-teal-500 text-teal-700 hover:bg-teal-50 sm:text-base"
            onClick={() => void copyWhatsAppSummary()}
            disabled={isCopyingSummary}
          >
            {isCopyingSummary ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            Copy Summary
          </button>
        </div>
        {latestWebProposalUrl ? (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/60 p-3 text-xs sm:text-sm">
            <p className="font-semibold text-teal-900">Web proposal link ready</p>
            <p className="mt-1 break-all font-mono text-[11px] text-teal-800 sm:text-xs">{latestWebProposalUrl}</p>
            {lastAutoLeadId ? (
              <p className="mt-2 text-[11px] text-teal-800">
                {t("proposal_leadCreatedSub")}{" "}
                <button
                  type="button"
                  className="font-bold underline underline-offset-2"
                  onClick={() => router.push(`/customers?lead=${encodeURIComponent(lastAutoLeadId)}`)}
                >
                  Open in Customers
                </button>
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="ss-cta-secondary text-xs sm:text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(latestWebProposalUrl).catch(() => undefined);
                  toast.success("Link copied", "Web proposal URL copied to clipboard.");
                }}
              >
                Copy link
              </button>
              <button type="button" className="ss-cta-primary text-xs sm:text-sm" onClick={shareLatestOnWhatsApp}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Send on WhatsApp
              </button>
            </div>
          </div>
        ) : null}
      </div>{/* closes system size ss-card */}
          </div>{/* end main builder column */}

          {/* Live preview panel â€” visible at lg+ (iPad Pro, desktop) */}
          <div className="hidden lg:block lg:w-60 lg:shrink-0 xl:w-72 2xl:w-80">
            <ProposalLivePreviewPanel
              presetId={osPresetId}
              customerName={osCustomerName}
              city={activeLead?.city ?? manual.city}
              systemKw={effectiveResult.solarKw}
              annualSaving={effectiveResult.annualSavings}
              netCost={effectiveResult.netCost}
              paybackLabel={effectiveResult.paybackDisplay}
              isBillBacked={isBillBackedLive}
              latestProposalUrl={latestWebProposalUrl}
              onGenerate={() => void generateWebProposal()}
              busy={isWebProposalBusy}
              onEditBlocks={() => setShowBlockPlaylist(true)}
            />
          </div>
        </div>{/* end OS layout flex */}
      </WorkspacePage>
    </>
  );
}

function manualSnapshot(manual: ManualProposalCustomer): Record<string, string> {
  return {
    leadContactName: manual.leadContactName,
    leadPhone: manual.leadPhone,
    billPhone: manual.billPhone,
    officialBillName: manual.officialBillName,
    city: manual.city,
    discom: manual.discom,
    state: manual.state,
    consumerId: manual.consumerId,
    meterNumber: manual.meterNumber,
    connectionDate: manual.connectionDate,
    phase: manual.phase,
    connectionType: manual.connectionType,
    sanctionedLoad: manual.sanctionedLoad,
    billingAddress: manual.billingAddress,
    tariffCategory: manual.tariffCategory,
    purposeOfSupply: manual.purposeOfSupply,
    contractDemandKva: manual.contractDemandKva
  };
}

const MONTH_KEYS: (keyof MonthlyUnits)[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_LABELS: Record<keyof MonthlyUnits, string> = {
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
  oct: "Oct",
  nov: "Nov",
  dec: "Dec"
};
const MONTH_LOOKUP: Record<string, keyof MonthlyUnits> = {
  jan: "jan",
  january: "jan",
  feb: "feb",
  february: "feb",
  mar: "mar",
  march: "mar",
  apr: "apr",
  april: "apr",
  may: "may",
  jun: "jun",
  june: "jun",
  jul: "jul",
  july: "jul",
  aug: "aug",
  august: "aug",
  sep: "sep",
  sept: "sep",
  september: "sep",
  oct: "oct",
  october: "oct",
  nov: "nov",
  november: "nov",
  dec: "dec",
  december: "dec"
};

function normalizeMonthToken(raw: string): keyof MonthlyUnits | null {
  const token = raw.toLowerCase().replace(/[^a-z]/g, "");
  return MONTH_LOOKUP[token] ?? null;
}

function monthKeyFromBillLabel(label: string | undefined): keyof MonthlyUnits | null {
  if (!label) return null;
  const parts = label
    .split(/[\s/-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const key = normalizeMonthToken(part);
    if (key) return key;
  }
  return null;
}

function numericBillAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  const parsed = Number.parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function pickActualMonthBillAmount(bill: ParsedBillShape): number | null {
  const currentMonth = numericBillAmount(bill.current_month_bill_amount_inr);
  if (currentMonth != null && currentMonth > 0) return currentMonth;

  // `total_amount_payable_inr` often includes arrears/NFP carry-forwards, so use
  // it only when no separate current-month line is present and arrears are absent.
  const principalArrear = Number.parseFloat(String(bill.principal_arrear_inr ?? "").replace(/[^\d.-]/g, ""));
  const hasArrear = Number.isFinite(principalArrear) && Math.abs(principalArrear) > 0.5;
  if (bill.nfp_flag || hasArrear) return null;

  return numericBillAmount(bill.total_amount_payable_inr);
}

function parseConnectionMonthIndex(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  const month = Number.parseInt(m[2], 10);
  let year = Number.parseInt(m[3], 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(year)) return null;
  if (year < 100) year += 2000;
  return year * 12 + (month - 1);
}

function parseHistoryMonthIndex(raw: string | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const yearMatch = text.match(/(20\d{2}|\d{2})/);
  if (!yearMatch) return null;
  let year = Number.parseInt(yearMatch[1], 10);
  if (year < 100) year += 2000;
  const parts = text.split(/[\s/-]+/).filter(Boolean);
  for (const part of parts) {
    const monthKey = normalizeMonthToken(part);
    if (!monthKey) continue;
    const monthIdx = MONTH_KEYS.indexOf(monthKey);
    if (monthIdx < 0) return null;
    return year * 12 + monthIdx;
  }
  return null;
}

function parseBillMonthIndex(raw: string | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const yearMatch = text.match(/(20\d{2}|\d{2})/);
  if (!yearMatch) return null;
  let year = Number.parseInt(yearMatch[1], 10);
  if (year < 100) year += 2000;
  const parts = text.split(/[\s/-]+/).filter(Boolean);
  for (const part of parts) {
    const monthKey = normalizeMonthToken(part);
    if (!monthKey) continue;
    const monthIdx = MONTH_KEYS.indexOf(monthKey);
    if (monthIdx < 0) return null;
    return year * 12 + monthIdx;
  }
  return null;
}

function buildMonthlyBillActualsFromBills(
  bills: Array<ParsedBillShape | null | undefined>,
  seedActuals?: Partial<Record<keyof MonthlyUnits, number>>
): Partial<Record<keyof MonthlyUnits, number>> {
  const out: Partial<Record<keyof MonthlyUnits, number>> = { ...(seedActuals ?? {}) };
  for (const bill of bills) {
    if (!bill) continue;
    const key = monthKeyFromBillLabel(bill.bill_month);
    if (!key) continue;
    const amount = pickActualMonthBillAmount(bill);
    if (amount != null && amount > 0) out[key] = amount;
  }
  return out;
}

function buildMonthlyAuditOverridesFromBills(
  bills: Array<ParsedBillShape | null | undefined>
): Partial<Record<keyof MonthlyUnits, {
  netPayableInr: number;
  energyInr?: number;
  fixedInr?: number;
  fppasInr?: number;
  electricityDutyInr?: number;
  units?: number;
  pfSurchargeInr?: number;
}>> {
  const out: Partial<Record<keyof MonthlyUnits, {
    netPayableInr: number;
    energyInr?: number;
    fixedInr?: number;
    fppasInr?: number;
    electricityDutyInr?: number;
    units?: number;
    pfSurchargeInr?: number;
  }>> = {};

  for (const bill of bills) {
    if (!bill) continue;
    const key = monthKeyFromBillLabel(bill.bill_month);
    if (!key) continue;
    const net = pickActualMonthBillAmount(bill);
    if (net == null || net <= 0) continue;

    const energyInr = billInrFromParsed(bill.energy_charges_inr) ?? undefined;
    const fixedInr = billInrFromParsed(bill.fixed_charges_inr) ?? undefined;
    const fppasInr = billInrFromParsed(bill.fppas_inr) ?? undefined;
    const electricityDutyInr = billInrFromParsed(bill.electricity_duty_inr) ?? undefined;
    const unitsVal = billInrFromParsed(bill.metered_unit_consumption) ?? undefined;

    // Welding/PF Surcharge: prefer explicit OCR field; fall back to computing
    // the gap between the printed net and standard components so that
    // energy + fixed + duty + fuel + pfSurcharge === total in all cases.
    let pfSurchargeInr: number | undefined;
    const explicitPf = billInrFromParsed(bill.pf_welding_surcharge_inr);
    if (explicitPf != null && explicitPf > 0) {
      pfSurchargeInr = explicitPf;
    } else if (
      energyInr != null && fixedInr != null &&
      fppasInr != null && electricityDutyInr != null
    ) {
      const compSum = energyInr + fixedInr + fppasInr + electricityDutyInr;
      const gap = net - compSum;
      if (gap > 50) pfSurchargeInr = Math.round(gap);
    }

    out[key] = {
      netPayableInr: net,
      ...(energyInr != null ? { energyInr } : {}),
      ...(fixedInr != null ? { fixedInr } : {}),
      ...(fppasInr != null ? { fppasInr } : {}),
      ...(electricityDutyInr != null ? { electricityDutyInr } : {}),
      ...(unitsVal != null ? { units: unitsVal } : {}),
      ...(pfSurchargeInr != null ? { pfSurchargeInr } : {})
    };
  }

  return out;
}

function extractDetectedMonths(parsed: ParsedBillShape | null): Set<keyof MonthlyUnits> {
  const detected = new Set<keyof MonthlyUnits>();
  if (!parsed) return detected;

  const billMonthIndex = parseBillMonthIndex(parsed.bill_month);
  if (billMonthIndex != null) {
    const connectionMonthIndex = parseConnectionMonthIndex(parsed.connection_date);
    let window = 6;
    if (connectionMonthIndex != null && billMonthIndex >= connectionMonthIndex) {
      const monthsSinceConnection = billMonthIndex - connectionMonthIndex + 1;
      window = Math.max(1, Math.min(6, monthsSinceConnection));
    }
    for (let offset = 0; offset < window; offset += 1) {
      const monthAbs = billMonthIndex - offset;
      const monthIdx = ((monthAbs % 12) + 12) % 12;
      const key = MONTH_KEYS[monthIdx];
      detected.add(key);
    }
    return detected;
  }

  const history = parsed.consumption_history ?? [];
  if (history.length > 0) {
    const connectionMonthIndex = parseConnectionMonthIndex(parsed.connection_date);
    for (const row of history) {
      if (!row || Number(row.units) <= 0) continue;
      if (connectionMonthIndex != null) {
        const rowMonthIndex = parseHistoryMonthIndex(String(row.month ?? ""));
        if (rowMonthIndex != null && rowMonthIndex < connectionMonthIndex) continue;
      }
      const parts = String(row.month ?? "")
        .split(/[\s/-]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      for (const part of parts) {
        const normalized = normalizeMonthToken(part);
        if (normalized) {
          detected.add(normalized);
          break;
        }
      }
    }
    // When history table exists, use it as source-of-truth for upload coverage chips.
    return detected;
  }

  for (const key of MONTH_KEYS) {
    const raw = parsed.months?.[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      detected.add(key);
      continue;
    }
    if (typeof raw === "string") {
      const num = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(num) && num > 0) detected.add(key);
    }
  }

  for (const row of history) {
    if (!row || Number(row.units) <= 0) continue;
    const parts = String(row.month ?? "")
      .split(/[\s/-]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const normalized = normalizeMonthToken(part);
      if (normalized) {
        detected.add(normalized);
        break;
      }
    }
  }

  return detected;
}

function buildUnitsFromConsumptionHistory(parsed: ParsedBillShape | null): Partial<MonthlyUnits> {
  const out: Partial<MonthlyUnits> = {};
  if (!parsed) return out;
  const history = parsed.consumption_history ?? [];

  // Track the highest year seen for each month key so that if the same calendar
  // month appears multiple times (e.g. APR-2025 and APR-2026), only the most
  // recent year's value is kept. This prevents the "same month last year" row
  // in the MP DISCOM history table (APR-2025) from overwriting more recent data.
  const yearForKey: Partial<Record<string, number>> = {};

  for (const row of history) {
    if (!row) continue;
    const units = Number(row.units ?? 0);
    if (!Number.isFinite(units) || units <= 0) continue;
    const rawMonth = String(row.month ?? "");
    const parts = rawMonth.split(/[\s/-]+/).map((part) => part.trim()).filter(Boolean);

    // Extract year from the month string (e.g. "APR-2025" â†’ year 2025)
    let rowYear = 0;
    for (const part of parts) {
      const n = Number(part);
      if (Number.isFinite(n) && n >= 2000 && n <= 2100) { rowYear = n; break; }
    }

    for (const part of parts) {
      const key = normalizeMonthToken(part);
      if (!key) continue;
      const existing = yearForKey[key] ?? 0;
      if (rowYear >= existing) {
        out[key as keyof MonthlyUnits] = Math.max(0, Math.round(units));
        yearForKey[key] = rowYear;
      }
      break;
    }
  }
  return out;
}

function parseLatestMonthIndex(label: string | undefined): number {
  if (!label) return new Date().getMonth();
  const parts = label.split(/[\s/-]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = normalizeMonthToken(part);
    if (m) return MONTH_KEYS.indexOf(m);
  }
  return new Date().getMonth();
}

function deriveBaseUnits(parsed: ParsedBillShape): number {
  const monthValues = MONTH_KEYS.map((k) => Number(parsed.months?.[k] ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  if (monthValues.length > 0) return Math.max(1, Math.round(monthValues[0]));
  const history = (parsed.consumption_history ?? [])
    .map((h) => Number(h?.units ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (history.length > 0) {
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    return Math.max(1, Math.round(avg));
  }
  const maybeMonthly = Number((parsed as any).months_average ?? 0);
  if (Number.isFinite(maybeMonthly) && maybeMonthly > 0) return Math.round(maybeMonthly);
  return 180;
}

function buildSixMonthAutofill(parsed: ParsedBillShape): Partial<MonthlyUnits> {
  const latestIndex = parseLatestMonthIndex(parsed.bill_month);
  const baseUnits = deriveBaseUnits(parsed);
  const seasonalMultipliers = [1, 0.96, 0.92, 1.04, 1.08, 1.02];
  const result: Partial<MonthlyUnits> = {};

  for (let offset = 0; offset < 6; offset += 1) {
    const monthIndex = (latestIndex - offset + 12) % 12;
    const key = MONTH_KEYS[monthIndex];
    const parsedValue = Number(parsed.months?.[key] ?? 0);
    const fallback = Math.max(0, Math.round(baseUnits * seasonalMultipliers[offset]));
    result[key] = Number.isFinite(parsedValue) && parsedValue > 0 ? Math.round(parsedValue) : fallback;
  }

  return result;
}

function stripStepPrefix(label: string): string {
  return label
    .replace(/^\s*(step|à¤šà¤°à¤£|à®ªà®Ÿà®¿)\s*\d+\s*[:\-]\s*/iu, "")
    .trim();
}

function stripManualSuffix(label: string): string {
  return label
    .replace(/\s*\(\s*manual override\s*\)\s*/iu, "")
    .replace(/\s*\(\s*à¤®à¥ˆà¤¨à¥à¤…à¤² à¤“à¤µà¤°à¤°à¤¾à¤‡à¤¡\s*\)\s*/iu, "")
    .trim();
}

function parseConnectedLoadKw(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (value.includes("kva")) return Number((numeric * 0.9).toFixed(2));
  return numeric;
}

function inferAreaProfile(manual: ManualProposalCustomer): "urban" | "rural" | undefined {
  const text = [manual.tariffCategory, manual.connectionType, manual.billingAddress, manual.city]
    .join(" ")
    .toLowerCase();
  if (!text.trim()) return undefined;
  if (text.includes("rural") || text.includes("gramin") || text.includes("village") || text.includes("gaon")) {
    return "rural";
  }
  if (text.includes("urban") || text.includes("city") || text.includes("nagar")) {
    return "urban";
  }
  return undefined;
}

function UploadCard({
  title,
  subtitle,
  busy,
  parsedBill,
  onPick
}: {
  title: string;
  subtitle: string;
  busy: boolean;
  parsedBill: ParsedBillShape | null;
  onPick: (file: File | null) => void;
}) {
  const detectedMonths = extractDetectedMonths(parsedBill);
  const topRowMonths = MONTH_KEYS.slice(0, 6);
  const bottomRowMonths = MONTH_KEYS.slice(6);

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300/80 bg-emerald-50/65 px-3 py-5 shadow-inner transition sm:min-h-[8rem] sm:px-4 sm:py-6",
          busy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-teal-500 hover:bg-emerald-50"
        )}
      >
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
          disabled={busy}
        />
        <div className="text-center">
          <p className="text-sm font-extrabold text-brand-800">{title}</p>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        {busy ? (
          <Skeleton className="mt-3 h-8 w-8 rounded-full" />
        ) : (
          <FileUp className="mt-3 h-8 w-8 text-brand-500" />
        )}
      </label>
      <div className="space-y-1.5">
        <div className="grid grid-cols-6 gap-1">
          {topRowMonths.map((month) => {
            const checked = detectedMonths.has(month);
            return (
              <span
                key={`top-${month}`}
                className={cn(
                  "inline-flex items-center justify-center rounded-md border px-1 py-1 text-[10px] font-bold tracking-wide sm:text-[11px]",
                  checked
                    ? "border-emerald-500/70 bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                )}
              >
                {checked ? `âœ“ ${MONTH_LABELS[month]}` : MONTH_LABELS[month]}
              </span>
            );
          })}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {bottomRowMonths.map((month) => {
            const checked = detectedMonths.has(month);
            return (
              <span
                key={`bottom-${month}`}
                className={cn(
                  "inline-flex items-center justify-center rounded-md border px-1 py-1 text-[10px] font-bold tracking-wide sm:text-[11px]",
                  checked
                    ? "border-emerald-500/70 bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                )}
              >
                {checked ? `âœ“ ${MONTH_LABELS[month]}` : MONTH_LABELS[month]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

