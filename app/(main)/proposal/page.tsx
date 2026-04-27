"use client";

import { BillAnalysisCharts } from "@/components/bill-analysis-charts";
import { useLanguage } from "@/lib/language-context";
import {
  applyTariffCategoryOverride,
  estimateMonthlyKwhFromBillAmount,
  getFallbackTariffContext
} from "@/lib/tariff-engine";
import { calculateSolar, DEFAULT_TARIFF_CONTEXT } from "@/lib/solar-engine";
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
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import {
  getBillingRule,
  getBillingUploadRequirement,
  isBillMonthAlignedForOffset
} from "@/lib/discom-billing-rules";
import { mergeCustomerForProposal, type ManualProposalCustomer } from "@/lib/merge-proposal-customer";
import { ProposalImageUploader } from "@/components/proposal-image-uploader";
import { swrDiscomsWithOfflineCache, swrTariffWithOfflineCache } from "@/lib/proposal-swr-fetchers";
import { cn } from "@/lib/utils";
import { Download, FileUp, Globe, MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const PIPELINE_SWR_KEY = "/api/pipeline";
const CLIENT_REF_STORAGE_KEY = "ss_device_ref";
const LEARNED_BILL_PROFILE_KEY = "ss_bill_upload_profile_v1";

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

/** CRM list: never throw — empty dropdown if API/Supabase unavailable */
async function swrCustomersSafe(url: string) {
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { ok?: boolean; data?: unknown };
    if (!j.ok || !Array.isArray(j.data)) return { data: [] as CustomerLead[] };
    return { data: j.data as CustomerLead[] };
  } catch {
    return { data: [] as CustomerLead[] };
  }
}

export default function ProposalPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { mutate: mutatePipeline } = useSWRConfig();
  const [monthlyUnits, setMonthlyUnits] = useState<MonthlyUnits>(() => emptyMonthlyUnits());
  const [latestBill, setLatestBill] = useState<ParsedBillShape | null>(null);
  const [additionalBills, setAdditionalBills] = useState<(ParsedBillShape | null)[]>([]);
  const [auditedMonthTotals, setAuditedMonthTotals] = useState<Partial<Record<keyof MonthlyUnits, number>>>({});
  const [billAnalysis, setBillAnalysis] = useState("");
  const [billAnalysisTone, setBillAnalysisTone] = useState<"neutral" | "success" | "warning" | "error">("neutral");
  const [scanTimingBadge, setScanTimingBadge] = useState("");
  const [isAnalyzingLatest, setIsAnalyzingLatest] = useState(false);
  const [isAnalyzingAdditional, setIsAnalyzingAdditional] = useState<boolean[]>([]);
  const [savePipelineBusy, setSavePipelineBusy] = useState(false);
  const [isPptDownloading, setIsPptDownloading] = useState(false);
  const [isCopyingSummary, setIsCopyingSummary] = useState(false);
  const [isWebProposalBusy, setIsWebProposalBusy] = useState(false);
  const [latestWebProposalUrl, setLatestWebProposalUrl] = useState<string | null>(null);
  // Proposal Builder Settings — controls the 12-slide deck.
  const [proposalLang, setProposalLang] = useState<"en" | "hi">("en");
  const [amcSelectedYears, setAmcSelectedYears] = useState<1 | 5 | 10>(5);
  const [financeRatePct, setFinanceRatePct] = useState(7);
  const [bankAccountName, setBankAccountName] = useState("Harihar Solar");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");
  // Site / past-installation photos (Supabase Storage URLs, max 6).
  const [siteImageUrls, setSiteImageUrls] = useState<string[]>([]);
  // Company logo (Supabase Storage public URL).
  const [installerLogoUrl, setInstallerLogoUrl] = useState("");
  const [showProposalSettings, setShowProposalSettings] = useState(false);
  const [overrideSolarKw, setOverrideSolarKw] = useState("");
  const [overridePanels, setOverridePanels] = useState("");
  const [installerState, setInstallerState] = useState("");
  const [installerDiscom, setInstallerDiscom] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const [learnedBillProfiles, setLearnedBillProfiles] = useState<Record<string, LearnedBillProfile>>({});
  const lastCalcPersistSignatureRef = useRef("");
  const uploadQueueRef = useRef<UploadTask[]>([]);
  const uploadWorkerRunningRef = useRef(false);
  const customerCacheRef = useRef<CustomerLead[]>([]);
  const [manual, setManual] = useState<ManualProposalCustomer>({
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
    tariffCategory: ""
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

  const stateForSizing = manual.state.trim() || installerState;
  const discomQuery = manual.discom.trim() || installerDiscom.trim();
  const stateQuery = manual.state.trim() || installerState.trim();
  const connectedLoadKw = useMemo(() => parseConnectedLoadKw(manual.sanctionedLoad), [manual.sanctionedLoad]);
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
  const uploadRequirement = useMemo(
    () => {
      const detectedHistoryMonths = latestBill?.consumption_history?.length ?? effectiveLearnedProfile?.historyWindowMonths ?? null;
      const base = getBillingUploadRequirement(billingRule, latestBill?.bill_month, detectedHistoryMonths);
      if (base.requiredBills > 1) return base;
      if (!effectiveLearnedProfile || effectiveLearnedProfile.requiredBills <= 1) return base;
      return getBillingUploadRequirement(
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
      );
    },
    [billingRule, latestBill?.bill_month, latestBill?.consumption_history, effectiveLearnedProfile]
  );
  const previousBill = additionalBills[0] ?? null;
  const isAnySecondaryBusy = isAnalyzingAdditional.some(Boolean);
  const requiredSecondaryCount = Math.max(0, uploadRequirement.requiredBills - 1);
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
        areaProfile
      }),
    [tariffContext, stateQuery, discomQuery, manual.tariffCategory, latestBill, additionalBills, connectedLoadKw, areaProfile]
  );

  const { data: discomsRes } = useSWR(discomsUrl, swrDiscomsWithOfflineCache, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000
  });
  const discomOptions = discomsRes?.data ?? [];

  const { data: customersRes } = useSWR("/api/customers", swrCustomersSafe, { revalidateOnFocus: false });
  const fetchedCustomers: CustomerLead[] = Array.isArray(customersRes?.data)
    ? (customersRes!.data as CustomerLead[])
    : [];
  if (fetchedCustomers.length > 0) {
    customerCacheRef.current = fetchedCustomers;
  }
  const customers: CustomerLead[] = fetchedCustomers.length > 0 ? fetchedCustomers : customerCacheRef.current;
  const isCustomersLoading = !customersRes;
  const restoreUrl =
    clientRef.length > 0
      ? `/api/calculations?clientRef=${encodeURIComponent(clientRef)}${
          selectedLeadId ? `&leadId=${encodeURIComponent(selectedLeadId)}` : ""
        }`
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
        connectedLoadKw: connectedLoadKw ?? undefined,
        areaProfile
      }),
    [monthlyUnits, effectiveTariffContext, stateForSizing, connectedLoadKw, areaProfile]
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
    const grossCost = Math.round(solarKw * 50000);
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
    if (!restoreRes || hydratedFromServer) return;
    const calc = restoreRes.latestCalculation;
    const bill = restoreRes.latestBillUpload;
    const hasServerPayload = Boolean(calc || bill);
    if (!hasServerPayload) {
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
      setManual((prev) => ({ ...prev, ...calc.manualSnapshot }));
    }
    if (calc?.latestBill) setLatestBill(calc.latestBill);
    else if (bill?.parsedBill) setLatestBill(bill.parsedBill);
 // 1. Bill ko ek pakke variable mein nikaal lijiye
const billToAdd = calc?.previousBill;

// 2. Sirf tabhi aage badhein jab billToAdd pakka maujood ho
if (billToAdd) {
  setAdditionalBills((prev) => {
    if (prev.length === 0) return [billToAdd];
    const next = [...prev];
    next[0] = billToAdd;
    return next;
  });
}

    if (!billAnalysis) {
      setBillAnalysis(t("proposal_billAutofillDone"));
    }
    setHydratedFromServer(true);
  }, [restoreRes, hydratedFromServer, billAnalysis, t]);

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
      tariffLabel: `${effectiveTariffContext.discomLabel} • ${effectiveTariffContext.source}`,
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
      const aiModelTier = payload.aiModelTier as "haiku" | "sonnet" | "fallback" | undefined;
      const scanDurationMs = Number(payload.scanDurationMs ?? 0);
      const analysisMessages = [
        payload.tariffAlert?.message,
        payload.discoveryAlert?.message,
        payload.parseQualityAlert?.message,
        payload.calibrationAlert?.message,
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
      setScanTimingBadge(seconds ? `${modelLabel} • ${seconds}s` : modelLabel);
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
      const parsedUnits = mergeParsedMonthsIntoUnits(emptyMonthlyUnits(), data.months);
      const parsedMonthCount = countFilledMonths(parsedUnits);
      const missingMonthHint =
        parsedMonthCount < 4
          ? `Only ${parsedMonthCount} month(s) detected. Please verify missing months manually for accurate proposal.`
          : "";
      if (slot === "latest") {
        setLatestBill(data);
        const inferred = inferProfileFromBill(data);
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
        phase: prev.phase || data.phase || "",
        billPhone: prev.billPhone || data.registered_mobile || "",
        connectionType: prev.connectionType || data.connection_type || "",
        sanctionedLoad: prev.sanctionedLoad || data.sanctioned_load || "",
        billingAddress: prev.billingAddress || data.address || "",
        tariffCategory: prev.tariffCategory || data.tariff_category || ""
      }));

      setMonthlyUnits((prev) => {
        const merged = mergeParsedMonthsIntoUnits(prev, data.months);
        if (slot !== "latest") return merged;
        const shouldInjectFallback = isFirstLatestUpload || countFilledMonths(merged) < 4;
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

  function applyLeadFromCrm(lead: CustomerLead) {
    setAuditedMonthTotals({});
    setManual((prev) => ({
      ...prev,
      leadContactName: lead.name,
      leadPhone: lead.phone ?? "",
      officialBillName: "",
      city: lead.city,
      discom: lead.discom
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

  async function saveToPipeline() {
    if (!selectedLeadId) {
      toast.info("Select CRM lead first", "Project tab save works only for a selected CRM customer.");
      return;
    }
    setSavePipelineBusy(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          official_name: manual.officialBillName.trim() || null,
          capacity_kw: `${effectiveResult.solarKw} kW`,
          detail: `${manual.city} · ${manual.discom}`.trim() || null,
          status: "pending",
          install_progress: 10,
          next_action: t("proposal_pipelineDefaultNextAction")
        })
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      void mutatePipeline(PIPELINE_SWR_KEY);
      setBillAnalysis(t("proposal_pipelineSaved"));
      toast.success("Project saved", "Pipeline card updated instantly.");
    } catch (e) {
      setBillAnalysis(e instanceof Error ? e.message : t("proposal_pipelineSaveErr"));
      toast.error("Save failed", e instanceof Error ? e.message : t("proposal_pipelineSaveErr"));
    } finally {
      setSavePipelineBusy(false);
    }
  }

  function buildProposalExtrasPayload() {
    const sanctionedLoadKw = (() => {
      const s = manual.sanctionedLoad?.trim();
      if (!s) return undefined;
      const num = Number(s.replace(/[^0-9.]/g, ""));
      return Number.isFinite(num) && num > 0 ? num : undefined;
    })();
    const siteImages = siteImageUrls
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 6);
    return {
      lang: proposalLang,
      amcSelectedYears,
      financeOption: { interestRatePct: financeRatePct, tenuresYears: [3, 5, 7] as number[] },
      customerProfile: {
        consumerId: manual.consumerId || undefined,
        meterNumber: manual.meterNumber || undefined,
        connectionDate: manual.connectionDate || undefined,
        connectionType: manual.connectionType || undefined,
        phase: manual.phase || undefined,
        sanctionedLoadKw
      },
      bankDetails: {
        accountName: bankAccountName.trim() || undefined,
        accountNumber: bankAccountNumber.trim() || undefined,
        ifsc: bankIfsc.trim() || undefined,
        branch: bankBranch.trim() || undefined,
        upiId: bankUpiId.trim() || undefined
      },
      siteImages: siteImages.length > 0 ? siteImages : undefined,
      installerLogoUrl: installerLogoUrl.trim() || undefined
    };
  }

  async function downloadPremiumPpt() {
    setIsPptDownloading(true);
    try {
      const merged = mergeCustomerForProposal(manual, latestBill || previousBill);
      const customerName = merged?.name?.trim() || manual.officialBillName || manual.leadContactName || "Customer";
      const location = [merged?.district || manual.city, merged?.state || manual.state].filter(Boolean).join(", ");
      const monthlyBillActuals = buildMonthlyBillActualsFromBills([latestBill, ...additionalBills], auditedMonthTotals);
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
        `Net investment: ₹${effectiveResult.netCost.toLocaleString("en-IN")}`,
        `Annual saving: ₹${effectiveResult.annualSavings.toLocaleString("en-IN")}`,
        `Payback: ${effectiveResult.paybackDisplay}`,
        `25Y profit estimate: ₹${effectiveResult.profit25yr.toLocaleString("en-IN")}`
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
    try {
      const merged = mergeCustomerForProposal(manual, latestBill || previousBill);
      const customerName = merged?.name?.trim() || manual.officialBillName || manual.leadContactName || "Customer";
      const location = [merged?.district || manual.city, merged?.state || manual.state].filter(Boolean).join(", ");
      const monthlyBillActuals = buildMonthlyBillActualsFromBills([latestBill, ...additionalBills], auditedMonthTotals);
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
          clientRef: clientRef || undefined,
          leadId: selectedLeadId || undefined,
          netCostInr: effectiveResult.netCost,
          panels: effectiveResult.panels,
          ...buildProposalExtrasPayload()
        })
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "Web proposal failed");
      }
      const json = (await response.json()) as { ok: boolean; id?: string; shareUrl?: string; persisted?: boolean };
      if (!json.ok) throw new Error("Web proposal could not be created");
      const shareUrl = json.shareUrl || (json.id ? `${window.location.origin}/proposal/${json.id}` : null);
      if (!shareUrl) throw new Error("No share URL returned");
      setLatestWebProposalUrl(shareUrl);
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Web proposal ready", "Share link copied — paste on WhatsApp.");
      } catch {
        toast.success("Web proposal ready", "Share link saved below.");
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
      `Namaste ${customer} 🌞`,
      ``,
      `${effectiveResult.solarKw} kW solar proposal aapke liye taiyaar hai:`,
      `• Net cost: ₹${effectiveResult.netCost.toLocaleString("en-IN")}`,
      `• Annual saving: ₹${effectiveResult.annualSavings.toLocaleString("en-IN")}`,
      `• Payback: ${effectiveResult.paybackDisplay}`,
      ``,
      `Full interactive proposal: ${latestWebProposalUrl}`
    ].join("\n");
    const phone = (manual.leadPhone || manual.billPhone || "").replace(/[^\d]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="ss-page-shell">
        <div className="ss-step-card space-y-2">
        <span className="ss-step-chip">Step 1</span>
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
                {isCustomersLoading ? "लोड हो रही है..." : " "}
              </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.city} ({c.discom})
            </option>
          ))}
        </FloatingLabelSelect>
        <p className="text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">{t("proposal_step1LeadHint")}</p>
      </div>

      {leadSelected ? (
        <div className="ss-card-subtle border-indigo-100 bg-indigo-50/50 p-4 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-800">{t("proposal_leadContactBlockTitle")}</p>
          <p className="mt-1 text-sm font-extrabold text-brand-900">{manual.leadContactName}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">
            {t("proposal_leadPhoneLabel")}: {manual.leadPhone || "—"}
          </p>
        </div>
      ) : null}

      <div className="ss-step-card">
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
                ? `Uploaded ${alignState.current} • Please match ${targetLabel}`
                : `Required • ${targetLabel}`;
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
            {(Object.keys(monthlyUnits) as (keyof MonthlyUnits)[]).map((m) => (
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
      </div>

      <div className="ss-card p-4 sm:p-5">
        <BillAnalysisCharts
          monthlyUnits={monthlyUnits}
          result={result}
          tariffContext={effectiveTariffContext}
          parsedBill={latestBill || previousBill}
        />
      </div>

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
            label={t("proposal_discomPickSub")}
            suppressHydrationWarning
            containerClassName="sm:col-span-2"
            disabled={!stateQuery}
            value={manual.discom && discomOptions.some((o) => o.code === manual.discom) ? manual.discom : ""}
            onChange={(e) => setManual((p) => ({ ...p, discom: e.target.value }))}
          >
            {!stateQuery ? (
              <option value="">{t("dashboard_selectState")}</option>
            ) : (
              <>
                <option value="">{t("proposal_discomPickPlaceholder")}</option>
                {discomOptions.map((o) => (
                  <option key={o.id} value={o.code}>
                    {o.name} — {o.code}
                  </option>
                ))}
              </>
            )}
          </FloatingLabelSelect>
          <FloatingLabelSelect
            label={t("proposal_statePlaceholder")}
            suppressHydrationWarning
            value={manual.state}
            onChange={(e) => setManual((p) => ({ ...p, state: e.target.value, discom: "" }))}
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
          <FloatingLabelSelect
            label={t("proposal_phasePlaceholder")}
            suppressHydrationWarning
            value={manual.phase}
            onChange={(e) => setManual((p) => ({ ...p, phase: e.target.value }))}
          >
            <option value="">{t("proposal_phasePlaceholder")}</option>
            <option value="Single phase">Single phase</option>
            <option value="Three phase">Three phase</option>
            <option value="Other / as per bill">Other / as per bill</option>
          </FloatingLabelSelect>
          <FloatingLabelInput
            label={t("proposal_connectionPlaceholder")}
            value={manual.connectionType}
            onChange={(e) => setManual((p) => ({ ...p, connectionType: e.target.value }))}
          />
          <FloatingLabelInput
            label="Sanctioned load (e.g. 5 kW, 8.5 kVA)"
            value={manual.sanctionedLoad}
            onChange={(e) => setManual((p) => ({ ...p, sanctionedLoad: e.target.value }))}
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

      {(latestBill || previousBill || manual.officialBillName) && (
        <div className="ss-card space-y-2 p-4 sm:p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 sm:text-sm">{t("proposal_billDetails")}</h3>
          <div className="grid gap-1 text-xs font-semibold text-slate-800 sm:text-sm">
            {[
              [t("proposal_rowLeadContact"), manual.leadContactName || "—"],
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
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className="break-words text-right">{String(val)}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="ss-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold text-brand-900 sm:text-lg">{t("proposal_recommended")}</h2>
        <p className="mt-2 break-words text-2xl font-extrabold tabular-nums text-solar-600 sm:text-3xl lg:text-4xl">
          ₹{effectiveResult.annualSavings.toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">{t("proposal_annualSavingsLine")}</p>
      </div>

      <div className="ss-card space-y-4 p-4 sm:p-5">
        {/* Solar System Size — editable */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("proposal_solarSizeLabel")}
            {overrideSolarKw && parseFloat(overrideSolarKw) !== result.solarKw && (
              <span className="ml-2 font-semibold text-indigo-500">Auto: {result.solarKw} kW</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-brand-300 bg-white px-3 py-1.5">
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                className="w-16 bg-transparent text-base font-extrabold text-brand-700 outline-none"
                value={overrideSolarKw || result.solarKw}
                onChange={(e) => {
                  setOverrideSolarKw(e.target.value);
                  setOverridePanels("");
                }}
              />
              <span className="text-sm font-bold text-brand-700">kW</span>
            </div>
            {[1, 2, 3, 4, 5, 6, 7.5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setOverrideSolarKw(String(v)); setOverridePanels(""); }}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                  effectiveResult.solarKw === v
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600"
                }`}
              >
                {v}
              </button>
            ))}
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

        {/* Panels — editable */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("proposal_panelsLabel")}
            <span className="ml-2 font-normal normal-case text-slate-400">(Auto: {Math.ceil((effectiveResult.solarKw * 1000) / 540)} panels @ 540W)</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-brand-300 bg-white px-3 py-1.5">
              <input
                type="number"
                min="1"
                max="500"
                step="1"
                className="w-16 bg-transparent text-base font-extrabold text-brand-700 outline-none"
                value={overridePanels || Math.ceil((effectiveResult.solarKw * 1000) / 540)}
                onChange={(e) => setOverridePanels(e.target.value)}
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
            {t("proposal_netCost")}: <span className="break-words font-extrabold text-brand-700">₹{effectiveResult.netCost.toLocaleString("en-IN")}</span>
          </p>
          <p className="text-xs font-semibold text-slate-700 sm:text-sm">
            {t("proposal_payback")}: <span className="font-extrabold text-brand-700">{effectiveResult.paybackDisplay}</span>
          </p>
        </div>
        {/* Proposal Builder Settings — controls the 12-slide deck */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowProposalSettings((s) => !s)}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Proposal Builder Settings
            </span>
            <span className="text-xs text-slate-500">
              {showProposalSettings ? "▲ Hide" : "▼ Customize"}
            </span>
          </button>
          {showProposalSettings ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {/* Language */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Language</label>
                <div className="mt-1 inline-flex rounded-full border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setProposalLang("en")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${proposalLang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposalLang("hi")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${proposalLang === "hi" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>
              {/* AMC */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AMC Plan</label>
                <div className="mt-1 inline-flex rounded-full border border-slate-300 bg-white p-0.5">
                  {[1, 5, 10].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setAmcSelectedYears(y as 1 | 5 | 10)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${amcSelectedYears === y ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                    >
                      {y} yr{y === 1 ? "" : "s"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Finance rate */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">EMI Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={financeRatePct}
                  onChange={(e) => setFinanceRatePct(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>
              {/* Company logo — real upload (PNG / JPEG, ≤ 2 MB) */}
              <div className="col-span-full">
                <ProposalImageUploader
                  mode="logo"
                  label="Company Logo"
                  hint="PNG or JPEG, square preferred, up to 2 MB. Used on every slide and the web proposal header."
                  value={installerLogoUrl}
                  onChange={setInstallerLogoUrl}
                />
              </div>
              {/* Bank section */}
              <div className="col-span-full grid gap-2 rounded-md bg-white p-2 sm:grid-cols-5">
                <p className="col-span-full text-[10px] font-bold uppercase tracking-wider text-slate-500">Banking — for Slide 11 QR</p>
                <input className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder="Account Name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                <input className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder="Account No." value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                <input className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder="IFSC" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} />
                <input className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder="Branch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                <input className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder="UPI ID (e.g. harihar@hdfc)" value={bankUpiId} onChange={(e) => setBankUpiId(e.target.value)} />
              </div>
              {/* Past-installation photos — real multi-upload (max 6, ≤ 8 MB each) */}
              <div className="col-span-full">
                <ProposalImageUploader
                  mode="sites"
                  label="Past Installation Photos"
                  hint="Up to 6 photos. JPEG / PNG / WebP, ≤ 8 MB each. Shown on the Banking slide gallery and the Closing slide."
                  values={siteImageUrls}
                  onChange={setSiteImageUrls}
                  max={6}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={savePipelineBusy} onClick={() => void saveToPipeline()} className="ss-cta-secondary sm:text-base">
            {savePipelineBusy ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : null}
            {t("proposal_savePipelineCta")}
          </button>
          <button
            type="button"
            className="ss-cta-primary sm:text-base"
            onClick={() => void generateWebProposal()}
            disabled={isWebProposalBusy}
          >
            {isWebProposalBusy ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <Globe className="mr-2 h-4 w-4" />}
            Generate Web Proposal
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
      </div>
      </div>
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
    tariffCategory: manual.tariffCategory
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
    const amount = numericBillAmount(bill.current_month_bill_amount_inr) ?? numericBillAmount(bill.total_amount_payable_inr);
    if (amount != null && amount > 0) out[key] = amount;
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
    .replace(/^\s*(step|चरण|படி)\s*\d+\s*[:\-]\s*/iu, "")
    .trim();
}

function stripManualSuffix(label: string): string {
  return label
    .replace(/\s*\(\s*manual override\s*\)\s*/iu, "")
    .replace(/\s*\(\s*मैनुअल ओवरराइड\s*\)\s*/iu, "")
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
                {checked ? `✓ ${MONTH_LABELS[month]}` : MONTH_LABELS[month]}
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
                {checked ? `✓ ${MONTH_LABELS[month]}` : MONTH_LABELS[month]}
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
