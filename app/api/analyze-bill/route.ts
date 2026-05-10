import { NextRequest, NextResponse } from "next/server";
import { analyzeBillWithProvider, type BillAiModelTier, type BillAiProvider } from "@/lib/bill-ai";
import { getDiscomFormatHint, upsertDiscomFormatHint } from "@/lib/discom-format-memory";
import { compareBillRatesWithDatabase } from "@/lib/tariff-self-learning";
import { queueDiscoveryIfNeeded } from "@/lib/discom-discovery";
import { saveRateChangeReport } from "@/lib/rate-change-reports";
import { saveBillUploadRecord } from "@/lib/supabase-persistence";
import { mergeParsedMonthsIntoUnits, emptyMonthlyUnits } from "@/lib/bill-parse";
import { evaluateBillModelCalibration } from "@/lib/bill-model-calibration";
import { upsertDiscomBillProfile } from "@/lib/discom-bill-profile";
import { parsePdfBillFallback } from "@/lib/pdf-bill-fallback";
import type { ParsedBillShape } from "@/lib/bill-parse";
import { auditMpBill, type MpBillAuditReport } from "@/lib/mp-bill-audit";
import { saveMpBillAuditRecord } from "@/lib/mp-bill-audit-persistence";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  base64Data: z.string().min(20, "File payload too small"),
  mimeType: z.string().min(3).max(120).optional(),
  /** Optional: load template hint from discom_formats before calling AI scanner */
  discomCode: z.string().max(120).optional().nullable(),
  clientRef: z.string().max(120).optional().nullable(),
  leadId: z.string().max(80).optional().nullable()
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf"
]);

function estimateParseConfidence(parsed: {
  state?: string;
  discom?: string;
  consumer_id?: string;
  bill_month?: string;
  total_amount_payable_inr?: number | string | null;
  months?: Partial<Record<string, number | string | null>>;
}): number {
  let score = 0;
  if (parsed.state?.trim()) score += 20;
  if (parsed.discom?.trim()) score += 20;
  if (parsed.consumer_id?.trim()) score += 15;
  if (parsed.bill_month?.trim()) score += 10;
  const totalRaw =
    typeof parsed.total_amount_payable_inr === "number"
      ? parsed.total_amount_payable_inr
      : parseFloat(String(parsed.total_amount_payable_inr ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(totalRaw) && totalRaw > 0) score += 15;
  const months = parsed.months ?? {};
  const monthHits = Object.values(months).filter((v) => {
    if (typeof v === "number") return Number.isFinite(v) && v > 0;
    if (typeof v === "string") return /\d/.test(v);
    return false;
  }).length;
  score += Math.min(20, monthHits * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isAiAccessFailure(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /model is unavailable|does not have permission|api key is invalid|request failed|rate limit|claude|anthropic/i.test(msg);
}

function currentMonthLabel(): string {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${d.getFullYear()}`;
}

function buildFallbackParsedBill(input: { discomCode?: string | null }): ParsedBillShape {
  return {
    name: "",
    address: "",
    consumer_id: "",
    meter_number: "",
    connection_date: "",
    sanctioned_load: "",
    phase: "",
    connection_type: "",
    tariff_category: "",
    discom: input.discomCode?.trim() || "",
    state: "",
    district: "",
    country: "India",
    bill_month: currentMonthLabel(),
    fixed_charges_inr: null,
    energy_charges_inr: null,
    total_amount_payable_inr: null,
    read_type: "",
    bill_type_label: "",
    metered_unit_consumption: null,
    total_amount_till_due_inr: null,
    total_amount_after_due_inr: null,
    current_month_bill_amount_inr: null,
    principal_arrear_inr: null,
    amount_received_against_bill_inr: null,
    mp_govt_subsidy_amount_inr: null,
    fppas_inr: null,
    rebate_incentive_inr: null,
    ccb_adjustment_inr: null,
    nfp_flag: false,
    strict_audit_mode: "strict_v1",
    strict_audit_notes: [],
    months: {},
    consumption_history: [],
    format_memory: "",
    tariff_slabs_detected: []
  };
}

function hasSparseBillIdentity(parsed: ParsedBillShape): boolean {
  const filled = [
    parsed.name,
    parsed.consumer_id,
    parsed.meter_number,
    parsed.connection_date,
    parsed.state,
    parsed.discom,
    parsed.address
  ].filter((v) => String(v ?? "").trim().length > 0).length;
  return filled < 3;
}

function toUserFacingAnalyzeError(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map((i) => i.message).join(", ");
  if (!(error instanceof Error)) return "Bill analysis failed. Please try again.";
  const msg = error.message || "Bill analysis failed.";
  if (/ANTHROPIC_API_KEY/i.test(msg)) return "Bill scanner is not configured. Please contact admin.";
  if (/model is unavailable for this API key/i.test(msg)) {
    return "Bill scanner model is unavailable for current API key. Please update model/API settings.";
  }
  if (/model is unavailable|does not have permission|rate limit|temporarily unavailable|request failed/i.test(msg)) {
    return msg;
  }
  if (/Claude API|Anthropic/i.test(msg) || /\{.*error.*\}/i.test(msg)) {
    return "Bill scanner failed due to provider mismatch. Please retry; if this continues, verify AI provider/model settings.";
  }
  return msg;
}

function fireAndForget(taskName: string, task: Promise<unknown>): void {
  void task.catch((error) => {
    console.warn(`[analyze-bill] background task failed (${taskName}):`, error);
  });
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const BILL_MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

function parseBillMonthYear(raw: string | undefined): { year: number; monthIndex: number } | null {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return null;
  const yearMatch = text.match(/(20\d{2}|\d{2})/);
  if (!yearMatch) return null;
  let year = Number.parseInt(yearMatch[1], 10);
  if (!Number.isFinite(year)) return null;
  if (year < 100) year += 2000;
  const monthToken = text.match(/[a-z]+/)?.[0] ?? "";
  const monthIndex = BILL_MONTH_MAP[monthToken];
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function isNewTariffCycleBill(parsed: ParsedBillShape): boolean {
  void parsed;
  // ─── TARIFF FREEZE DECISION (recorded May 2026) ──────────────────────────────
  // MPERC FY 2026-27 tariff order has been issued (effective April 2026).
  // DELIBERATE DECISION: SOL.52 will continue using FY 2025-26 tariff for all
  // bill analysis and solar sizing calculations until explicitly unlocked.
  // Reason: FY 2026-27 tariff rates and slabs are not yet codified in the engine.
  // Action required before enabling: add mp-tariff-2026-27.ts, update
  // mp-bill-engine.ts imports, then change this function to return true for
  // bills with bill_month >= APR-2026.
  // ─────────────────────────────────────────────────────────────────────────────
  return false;
}

function classifyLearningGuard(parsed: ParsedBillShape): {
  shouldSkipSelfLearning: boolean;
  reason: string | null;
} {
  const readType = String(parsed.read_type ?? "").toLowerCase();
  const billType = String(parsed.bill_type_label ?? "").toLowerCase();
  const metered = toNumber(parsed.metered_unit_consumption);
  const currentBill = toNumber(parsed.current_month_bill_amount_inr);
  const arrear = toNumber(parsed.principal_arrear_inr);

  if (parsed.nfp_flag || /\bnfp\b|not\s*for\s*payment/.test(billType)) {
    return {
      shouldSkipSelfLearning: true,
      reason:
        "Non-smart / special meter pattern detected: bill marked NFP (Not For Payment). Auto-learning is disabled; please verify manually."
    };
  }
  if (/\bassessment|assessed|provisional\b/.test(readType)) {
    return {
      shouldSkipSelfLearning: true,
      reason:
        "Non-smart / special meter pattern detected: assessment/provisional billing found. Auto-learning is disabled; please verify manually."
    };
  }
  if (metered != null && metered <= 0 && currentBill != null && currentBill > 0) {
    return {
      shouldSkipSelfLearning: true,
      reason:
        "Non-smart / special meter pattern detected: metered units are zero but bill amount is non-zero. Auto-learning is disabled; please verify manually."
    };
  }
  if (arrear != null && Math.abs(arrear) > 0.5) {
    return {
      shouldSkipSelfLearning: true,
      reason:
        "Non-smart / special meter pattern detected: arrear-adjusted bill. Auto-learning is disabled; please verify manually."
    };
  }
  return { shouldSkipSelfLearning: false, reason: null };
}

async function resetLearnedProfileForGuardedBill(parsed: ParsedBillShape): Promise<boolean> {
  const state = String(parsed.state ?? "").trim();
  const discom = String(parsed.discom ?? "").trim();
  if (!state || !discom) return false;
  try {
    const res = await upsertDiscomBillProfile({
      state,
      discom,
      historyWindowMonths: 12,
      requiredBills: 1,
      confidence: 0.2,
      source: "guard_reset_non_smart"
    });
    return Boolean(res.ok);
  } catch (error) {
    console.warn("[analyze-bill] guarded profile reset failed:", error);
    return false;
  }
}

function buildStrictAuditAmountReason(parsed: ParsedBillShape): {
  mode: "strict_v1";
  meteredUnitConsumption: number | null;
  currentMonthBillInr: number | null;
  totalPayableInr: number | null;
  totalTillDueInr: number | null;
  nfp: boolean;
  keyReasons: string[];
} {
  const metered = toNumber(parsed.metered_unit_consumption);
  const currentMonthBill = toNumber(parsed.current_month_bill_amount_inr);
  const totalPayable = toNumber(parsed.total_amount_payable_inr);
  const totalTillDue = toNumber(parsed.total_amount_till_due_inr);
  const fppas = toNumber(parsed.fppas_inr);
  const subsidy = toNumber(parsed.mp_govt_subsidy_amount_inr);
  const rebate = toNumber(parsed.rebate_incentive_inr);
  const arrear = toNumber(parsed.principal_arrear_inr);
  const received = toNumber(parsed.amount_received_against_bill_inr);
  const nfp = Boolean(parsed.nfp_flag);
  const reasons: string[] = [];

  if (metered != null) {
    reasons.push(`Metered unit consumption ${metered.toFixed(2)} is the primary bill driver.`);
  } else {
    reasons.push("Metered unit consumption is missing; review bill image for unit line.");
  }
  if (currentMonthBill != null) reasons.push(`Current month bill amount printed: ₹${currentMonthBill.toFixed(2)}.`);
  if (fppas != null) reasons.push(`FPPAS adjustment present: ₹${fppas.toFixed(2)}.`);
  if (subsidy != null) reasons.push(`M.P. Govt. subsidy line present: ₹${subsidy.toFixed(2)}.`);
  if (rebate != null) reasons.push(`Rebate/incentive impact present: ₹${rebate.toFixed(2)}.`);
  if (arrear != null && arrear !== 0) reasons.push(`Principal arrear contributes: ₹${arrear.toFixed(2)}.`);
  if (received != null && received !== 0) reasons.push(`Received-against-bill entry affects net payable: ₹${received.toFixed(2)}.`);
  if (nfp) reasons.push("Bill marked NFP (Not For Payment).");
  if (nfp && currentMonthBill != null && totalPayable != null && totalPayable < currentMonthBill) {
    reasons.push("NFP bill: payable can be 0 even when current month bill amount is non-zero.");
  }
  if (reasons.length === 0) reasons.push("No strict amount components were confidently extracted.");

  return {
    mode: "strict_v1",
    meteredUnitConsumption: metered,
    currentMonthBillInr: currentMonthBill,
    totalPayableInr: totalPayable,
    totalTillDueInr: totalTillDue,
    nfp,
    keyReasons: reasons
  };
}

async function safeParsePdfFallback(base64Data: string): Promise<ParsedBillShape | null> {
  try {
    return await parsePdfBillFallback(base64Data);
  } catch (error) {
    console.warn("[analyze-bill] local pdf fallback failed:", error);
    return null;
  }
}

async function queuePostScanTasks(input: {
  parsed: ParsedBillShape;
  usedAiFallback: boolean;
  scannerMode: BillAiProvider | "fallback_manual" | "local_pdf";
  disableSelfLearning?: boolean;
  suppressOldTariffMismatchAlerts?: boolean;
}): Promise<void> {
  const { parsed, usedAiFallback, scannerMode, disableSelfLearning, suppressOldTariffMismatchAlerts } = input;
  if (usedAiFallback || scannerMode !== "anthropic") return;
  if (disableSelfLearning) {
    console.info("[analyze-bill] self-learning skipped for guarded bill pattern.");
    return;
  }

  const [compareRes, discoveryRes, calibrationRes] = await Promise.all([
    compareBillRatesWithDatabase(parsed),
    queueDiscoveryIfNeeded(parsed),
    evaluateBillModelCalibration(parsed)
  ]);

  const asyncOps: Array<Promise<unknown>> = [];
  if (!suppressOldTariffMismatchAlerts && compareRes.checked && compareRes.mismatch) {
    asyncOps.push(
      saveRateChangeReport({
        installerName: "AI Auto Detector",
        installerState: parsed.state?.trim() || "Unknown State",
        activeTariff: compareRes.activeTariff,
        source: "ai_scan",
        detectedRates: compareRes.detectedRates,
        databaseRates: compareRes.databaseRates,
        status: "pending_admin_approval",
        note: `Auto mismatch from bill scan: detected ${compareRes.detectedRates.join(", ")} vs db ${compareRes.databaseRates.join(", ")}`
      })
    );
  }

  const parseConfidence = estimateParseConfidence(parsed);
  if (parseConfidence < 55) {
    asyncOps.push(
      saveRateChangeReport({
        installerName: "SOL.52 Parse Quality Bot",
        installerState: parsed.state?.trim() || "Unknown State",
        activeTariff: parsed.discom?.trim() || compareRes.activeTariff || "Unknown DISCOM",
        source: "ai_scan",
        status: "pending_admin_approval",
        note: `Low parse confidence (${parseConfidence}%). Needs admin review before trusting auto-filled bill fields.`,
        dedupeWindowHours: 72
      })
    );
  }

  if (!suppressOldTariffMismatchAlerts && calibrationRes.checked && calibrationRes.shouldQueue) {
    asyncOps.push(
      saveRateChangeReport({
        installerName: "SOL.52 Calibration Bot",
        installerState: calibrationRes.state || "Unknown State",
        activeTariff: calibrationRes.discom || compareRes.activeTariff || "Unknown DISCOM",
        source: "ai_scan",
        status: "pending_admin_approval",
        detectedRates: [calibrationRes.actualPerUnit],
        databaseRates: [calibrationRes.modeledPerUnit],
        dedupeWindowHours: 72,
        note:
          `[calibration] model mismatch ${calibrationRes.errorPercent}% (actual ₹${calibrationRes.actualBillInr}, modeled ₹${calibrationRes.modeledBillInr}, units ${calibrationRes.unitsUsed} via ${calibrationRes.unitSource}). ` +
          `Suggestion: energy x${calibrationRes.suggestion.energyRateMultiplier}, fixed ${calibrationRes.suggestion.fixedChargeDeltaInr >= 0 ? "+" : ""}${calibrationRes.suggestion.fixedChargeDeltaInr}, ` +
          `fuel ${calibrationRes.suggestion.fuelPerKwhDelta >= 0 ? "+" : ""}${calibrationRes.suggestion.fuelPerKwhDelta}/kWh, duty ${calibrationRes.suggestion.dutyRateDeltaPctPoint >= 0 ? "+" : ""}${calibrationRes.suggestion.dutyRateDeltaPctPoint}pp.`
      })
    );
  }

  const historyWindow = Math.max(0, parsed.consumption_history?.length ?? 0);
  if (parsed.state?.trim() && parsed.discom?.trim() && historyWindow > 0 && historyWindow < 12) {
    const requiredBills = Math.max(1, Math.min(6, Math.ceil(12 / historyWindow)));
    asyncOps.push(
      upsertDiscomBillProfile({
        state: parsed.state,
        discom: parsed.discom,
        historyWindowMonths: historyWindow,
        requiredBills,
        confidence: 0.82,
        source: "self_learning_ai_scan"
      })
    );
  }

  if (discoveryRes.queued) {
    console.info("[analyze-bill] discovery queued:", discoveryRes.message);
  }

  if (asyncOps.length > 0) {
    await Promise.allSettled(asyncOps);
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { base64Data, mimeType: rawMime, discomCode, clientRef, leadId } = bodySchema.parse(json);
    const mimeType = rawMime?.split(";")[0]?.trim().toLowerCase() || "image/jpeg";

    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported file type: ${mimeType}. Use JPG, PNG, WEBP, or PDF.` },
        { status: 400 }
      );
    }

    const codeForHint = (discomCode ?? "").trim();
    const formatHint = codeForHint ? await getDiscomFormatHint(codeForHint) : null;
    let parsed: ParsedBillShape;
    let aiFallbackAlert:
      | {
          type: "info";
          status: "pending_admin_approval";
          message: string;
        }
      | undefined;
    let usedAiFallback = false;
    let scannerMode: BillAiProvider | "fallback_manual" | "local_pdf" = "anthropic";
    let aiModelTier: BillAiModelTier | "fallback" = "haiku";
    let scanDurationMs = 0;
    const scanStartMs = Date.now();
    try {
      const result = await analyzeBillWithProvider(base64Data, mimeType, {
        formatHint: formatHint ?? undefined
      });
      parsed = result.parsed;
      scannerMode = result.provider;
      aiModelTier = result.tier;
    } catch (e) {
      usedAiFallback = true;
      aiModelTier = "fallback";
      parsed = buildFallbackParsedBill({ discomCode: codeForHint });
      const scannerMsg = e instanceof Error ? e.message : "Bill scanner failed";
      const reason = isAiAccessFailure(e)
        ? "AI scan could not run on current provider configuration."
        : "AI scanner could not parse this bill right now.";
      if (mimeType === "application/pdf") {
        const local = await safeParsePdfFallback(base64Data);
        if (local) {
          parsed = { ...parsed, ...local, discom: parsed.discom || codeForHint || local.discom || "" };
          scannerMode = "local_pdf";
          aiFallbackAlert = undefined;
        } else {
          scannerMode = "fallback_manual";
          aiFallbackAlert = {
            type: "info",
            status: "pending_admin_approval",
            message: `${reason} Bill upload is saved in manual mode — please fill or verify monthly units.`
          };
        }
      } else {
        scannerMode = "fallback_manual";
        aiFallbackAlert = {
          type: "info",
          status: "pending_admin_approval",
          message: `${reason} Bill upload is saved in manual mode — please fill or verify monthly units.`
        };
      }
      console.warn("[analyze-bill] scanner fallback activated:", scannerMsg);
    } finally {
      scanDurationMs = Math.max(1, Date.now() - scanStartMs);
    }

    if (!usedAiFallback && mimeType === "application/pdf" && hasSparseBillIdentity(parsed)) {
      const local = await safeParsePdfFallback(base64Data);
      if (local) {
        parsed = {
          ...parsed,
          ...local,
          name: parsed.name || local.name || "",
          address: parsed.address || local.address || "",
          consumer_id: parsed.consumer_id || local.consumer_id || "",
          meter_number: parsed.meter_number || local.meter_number || "",
          connection_date: parsed.connection_date || local.connection_date || "",
          state: parsed.state || local.state || "",
          discom: parsed.discom || local.discom || codeForHint || "",
          // Always keep the AI's bill_month and metered reading — the local PDF fallback
          // can misread the "Bill Month" label that appears near the PREVIOUS billing
          // period in the reading section (e.g. MAR-2026 near "Bill Month" column header
          // in the reading table), causing it to overwrite the correct APR-2026 value.
          bill_month: parsed.bill_month?.trim() ? parsed.bill_month : (local.bill_month ?? ""),
          metered_unit_consumption: parsed.metered_unit_consumption ?? local.metered_unit_consumption ?? null
        };
      }
    }

    // ── Safety net: force current bill month slot = metered_unit_consumption ──────
    // Problem: MP DISCOM bills show the PREVIOUS billing period month (e.g. MAR-2026)
    // near a "Bill Month" column header in the reading section. Claude sometimes picks
    // that up as bill_month instead of the real APR-2026. If we rely solely on
    // bill_month to pick the months key, we'd write 419 into months.mar (wrong) and
    // leave months.apr = 357 (from APR-2025 in the Last Six Months history table).
    //
    // Robust two-step strategy:
    //   1. Infer current month from consumption_history: most recent history month + 1.
    //      (e.g. history has MAR-2026 as latest → current = APR-2026 → key = "apr")
    //   2. Fall back to parsed bill_month if history is unavailable.
    // ─────────────────────────────────────────────────────────────────────────────
    const meteredUnitsForFix = toNumber(parsed.metered_unit_consumption);
    if (meteredUnitsForFix != null && meteredUnitsForFix > 0) {
      const MONTH_KEYS_ARR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
      let currentMonthKey: typeof MONTH_KEYS_ARR[number] | null = null;

      // Strategy 1 — infer from consumption_history (most reliable)
      const histTotals = (parsed.consumption_history ?? [])
        .map((r) => {
          const p = parseBillMonthYear(r.month);
          return p ? p.year * 12 + p.monthIndex : -1;
        })
        .filter((v) => v > 0);
      if (histTotals.length > 0) {
        const maxHistTotal = Math.max(...histTotals);
        const nextTotal = maxHistTotal + 1;
        const nextMonthIdx = nextTotal % 12;
        currentMonthKey = MONTH_KEYS_ARR[nextMonthIdx];
      }

      // Strategy 2 — fall back to bill_month if history gave nothing
      if (!currentMonthKey) {
        const billMonthParsed = parseBillMonthYear(parsed.bill_month);
        if (billMonthParsed) {
          currentMonthKey = MONTH_KEYS_ARR[billMonthParsed.monthIndex];
        }
      }

      if (currentMonthKey) {
        if (!parsed.months) parsed.months = {};
        parsed.months[currentMonthKey] = Math.round(meteredUnitsForFix);
      }
    }

    const discomForMemory = (parsed.discom ?? codeForHint).trim();
    if (discomForMemory && parsed.format_memory?.trim()) {
      fireAndForget("discom-format-memory", upsertDiscomFormatHint(discomForMemory, parsed.format_memory));
    }

    const mergedUnits = mergeParsedMonthsIntoUnits(emptyMonthlyUnits(), parsed.months);
    const savedToBillUploads = await saveBillUploadRecord({
      clientRef: clientRef ?? null,
      leadId: leadId ?? null,
      mimeType,
      discomCode: codeForHint || null,
      parsedBill: parsed,
      monthlyUnits: mergedUnits
    });

    const calibration = {
      checked: false,
      shouldQueue: false,
      reason: "missing_state_or_discom" as const,
      state: "",
      discom: "",
      unitsUsed: 0,
      unitsSource: null,
      actualBillInr: 0,
      modeledBillInr: 0,
      absoluteDeltaInr: 0,
      errorPercent: 0,
      actualPerUnit: 0,
      modeledPerUnit: 0,
      suggestion: {
        energyRateMultiplier: 1,
        fixedChargeDeltaInr: 0,
        fuelPerKwhDelta: 0,
        dutyRateDeltaPctPoint: 0
      }
    };
    const learningGuard = classifyLearningGuard(parsed);
    const newTariffCycleBill = isNewTariffCycleBill(parsed);
    let learningResetApplied = false;
    if (learningGuard.shouldSkipSelfLearning) {
      learningResetApplied = await resetLearnedProfileForGuardedBill(parsed);
    }
    const parseConfidence = usedAiFallback && scannerMode === "fallback_manual" ? 0 : estimateParseConfidence(parsed);
    fireAndForget(
      "post-scan-checks",
      queuePostScanTasks({
        parsed,
        usedAiFallback,
        scannerMode,
        disableSelfLearning: learningGuard.shouldSkipSelfLearning,
        suppressOldTariffMismatchAlerts: newTariffCycleBill
      })
    );

    let mpAudit: MpBillAuditReport | null = null;
    const looksLikeMp =
      /madhya pradesh|mppkv|mppgvv|mpmkvv|mppakvv|mpcz|mpez|mpwz/i.test(
        `${parsed.state ?? ""} ${parsed.discom ?? ""} ${codeForHint}`
      );
    if (looksLikeMp && !usedAiFallback) {
      try {
        mpAudit = auditMpBill(parsed);
        fireAndForget(
          "mp-bill-audit-persist",
          saveMpBillAuditRecord({
            report: mpAudit,
            clientRef: clientRef ?? null,
            leadId: leadId ?? null
          })
        );
      } catch (auditError) {
        console.warn("[analyze-bill] mp audit failed:", auditError);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: parsed,
        strictAudit: buildStrictAuditAmountReason(parsed),
        mpAudit,
        persisted: { billUploadSaved: savedToBillUploads },
        tariffAlert: undefined,
        discoveryAlert: undefined,
        parseQualityAlert: undefined,
        calibrationAlert: undefined,
        learningGuardAlert: learningGuard.shouldSkipSelfLearning
          ? {
              type: "info",
              status: "guarded_non_smart_pattern",
              message: learningResetApplied
                ? `${learningGuard.reason} Previous learned profile for this DISCOM has been reset to safe defaults.`
                : learningGuard.reason
            }
          : undefined,
        tariffCycleInfo: newTariffCycleBill
          ? {
              type: "info",
              status: "new_tariff_cycle_detected",
              message: "New tariff cycle bill detected (Apr 2026+). Old-tariff mismatch alerts are suppressed."
            }
          : undefined,
        learningUpdateInfo:
          !learningGuard.shouldSkipSelfLearning && !usedAiFallback && scannerMode === "anthropic"
            ? {
                type: "info",
                status: "learning_update_applied",
                message: "Bill quality looks good. SOL.52 will use this scan to improve billing profile accuracy."
              }
            : undefined,
        aiFallbackAlert,
        scannerMode,
        aiModelTier,
        scanDurationMs,
        parseConfidence,
        calibration,
        postProcessingQueued: !usedAiFallback && scannerMode !== "fallback_manual" && scannerMode !== "local_pdf"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = toUserFacingAnalyzeError(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
