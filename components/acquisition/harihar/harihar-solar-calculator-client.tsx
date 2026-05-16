"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Zap
} from "lucide-react";

import { INDIAN_STATES_AND_UTS } from "@/lib/indian-states-uts";
import type { HomeownerSolarEstimateOutput } from "@/lib/public-solar-calculator";
import type { DiscomOption } from "@/lib/supabase-discoms";
import { AnimatedInr } from "@/components/acquisition/harihar/animated-inr";
import { BillSavingsChart, TwentyFiveYearSpark } from "@/components/acquisition/harihar/bill-savings-chart";
import { RooftopIllustration } from "@/components/acquisition/harihar/rooftop-illustration";
import { PlatformBrandBadge } from "@/components/acquisition/platform-brand-badge";
import {
  ACQUISITION_SOURCE_META_KEYS,
  INTELLIGENCE_ENGINE_LINE,
  getAcquisitionBrand
} from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

const WA_E164 = (process.env.NEXT_PUBLIC_HARIHAR_WHATSAPP_E164 ?? "919993322267").replace(/\D/g, "");
const HARIHAR_BRAND = getAcquisitionBrand("harihar_solar");

const ROOF_TYPES = [
  { id: "rcc_flat" as const, label: "RCC flat", sub: "Concrete slab" },
  { id: "metal_sheet" as const, label: "Metal sheet", sub: "Industrial / shed" },
  { id: "tile" as const, label: "Tile / pitched", sub: "Traditional roof" },
  { id: "other" as const, label: "Other / mixed", sub: "We will survey" }
];

type RoofId = (typeof ROOF_TYPES)[number]["id"];

async function fetchDiscoms(url: string): Promise<DiscomOption[]> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as { ok?: boolean; data?: DiscomOption[]; error?: string };
  if (!json.ok) throw new Error(json.error ?? "DISCOM list failed");
  return json.data ?? [];
}

async function postEstimate(_key: string, { arg }: { arg: Record<string, unknown> }): Promise<HomeownerSolarEstimateOutput> {
  const res = await fetch("/api/v1/public/estimate-solar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg)
  });
  const json = (await res.json()) as HomeownerSolarEstimateOutput | { ok: false; error?: string };
  if (!res.ok || !("estimates" in json)) {
    throw new Error((json as { error?: string }).error ?? "Estimate failed");
  }
  return json;
}

function currentBillMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildWaLink(message: string) {
  const q = encodeURIComponent(message);
  return `https://wa.me/${WA_E164}?text=${q}`;
}

export function HariharSolarCalculatorClient() {
  const [monthlyBill, setMonthlyBill] = useState(4500);
  const [state, setState] = useState(HARIHAR_BRAND.defaultState ?? "Madhya Pradesh");
  const [discom, setDiscom] = useState("");
  const [roofType, setRoofType] = useState<RoofId>("rcc_flat");

  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadOk, setLeadOk] = useState(false);
  const [leadErr, setLeadErr] = useState<string | null>(null);

  const discomUrl = state.trim()
    ? `/api/discoms?state=${encodeURIComponent(state.trim())}`
    : null;

  const { data: discoms, isLoading: discomsLoading, error: discomsError } = useSWR(discomUrl, fetchDiscoms, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000
  });

  useEffect(() => {
    if (!discoms?.length) return;
    setDiscom((prev) => {
      if (prev && discoms.some((d) => d.code === prev || d.name === prev)) return prev;
      return discoms[0]?.code ?? discoms[0]?.name ?? "";
    });
  }, [discoms]);

  const { trigger, isMutating, data, error, reset } = useSWRMutation("harihar-estimate-v1", postEstimate);

  const canSubmit = state.trim().length >= 2 && discom.trim().length >= 1 && monthlyBill >= 500;

  const runEstimate = useCallback(async () => {
    setLeadOk(false);
    setLeadErr(null);
    await trigger({
      state: state.trim(),
      discom: discom.trim(),
      averageMonthlyBillInr: monthlyBill,
      billMonth: currentBillMonth()
    });
  }, [trigger, state, discom, monthlyBill]);

  const estimates = data?.estimates;

  const waMessage = useMemo(() => {
    if (!estimates) {
      return "Hi Harihar Solar — I want to know more about rooftop solar for my home.";
    }
    return [
      "Hi Harihar Solar — I used your online calculator.",
      `Approx monthly bill I entered: ₹${monthlyBill.toLocaleString("en-IN")}.`,
      `State: ${state}. DISCOM: ${discom}.`,
      `Roof: ${ROOF_TYPES.find((r) => r.id === roofType)?.label ?? roofType}.`,
      `Calculator suggested ~${estimates.recommendedSystemKw} kW, ~₹${estimates.estimatedAnnualSavingsInr.toLocaleString("en-IN")}/yr savings (model).`,
      "Please share a detailed proposal and site survey options."
    ].join(" ");
  }, [estimates, monthlyBill, state, discom, roofType]);

  const proposalLink = buildWaLink(waMessage);

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setLeadErr(null);
    setLeadBusy(true);
    try {
      const phone = leadPhone.replace(/[^\d+]/g, "");
      const source_meta: Record<string, unknown> = {
        [ACQUISITION_SOURCE_META_KEYS.brandSlug]: HARIHAR_BRAND.slug,
        [ACQUISITION_SOURCE_META_KEYS.funnel]: "harihar_solar_calculator",
        [ACQUISITION_SOURCE_META_KEYS.surface]: "acquisition_calculator",
        [ACQUISITION_SOURCE_META_KEYS.engineVersion]: data?.engineVersion,
        roof_type: roofType,
        recommended_kw: estimates?.recommendedSystemKw,
        annual_savings_inr: estimates?.estimatedAnnualSavingsInr,
        subsidy_inr: estimates?.centralSubsidyInr,
        discom,
        state
      };
      const res = await fetch("/api/leads/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName.trim(),
          phone,
          city: "",
          state: state.trim(),
          discom: discom.trim(),
          monthly_bill: monthlyBill,
          email: leadEmail.trim() || undefined,
          source: "website",
          source_meta
        })
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not save your details");
      setLeadOk(true);
    } catch (err) {
      setLeadErr(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLeadBusy(false);
    }
  }

  return (
    <div className="relative isolate min-h-[100dvh] pb-16 pt-6 sm:pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_0%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(45,212,191,0.12),transparent_50%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8 px-4 sm:max-w-2xl lg:max-w-5xl lg:flex-row lg:items-start lg:gap-12">
        <header className="flex flex-1 flex-col gap-6 lg:sticky lg:top-8 lg:max-w-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
              <SunMedium className="h-6 w-6 text-amber-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-teal-200/90">Harihar Solar</p>
              <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                Know your solar savings
              </h1>
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            A few details — we run your numbers on the {INTELLIGENCE_ENGINE_LINE}. No guesswork in the UI:
            every figure below comes from your inputs and our live tariff model.
          </p>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <RooftopIllustration className="w-full opacity-95" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              DISCOM-aware model
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-300/90" />
              Subsidy-aware estimate
            </span>
          </div>
        </header>

        <div className="flex flex-[1.35] flex-col gap-6 lg:min-w-0">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                <Calculator className="h-4 w-4 text-cyan-400" />
                Your home
              </h2>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                Step 1
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <label htmlFor="bill" className="text-sm font-medium text-slate-200">
                    Monthly electricity bill
                  </label>
                  <span className="font-mono text-lg font-semibold text-cyan-200">
                    ₹<AnimatedInr value={monthlyBill} />
                  </span>
                </div>
                <input
                  id="bill"
                  type="range"
                  min={500}
                  max={80000}
                  step={100}
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Number(e.target.value))}
                  className="harihar-range w-full"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>₹500</span>
                  <span>₹80,000</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="state" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    State / UT
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setDiscom("");
                      reset();
                    }}
                    className="harihar-select w-full"
                  >
                    {INDIAN_STATES_AND_UTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="discom" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    DISCOM
                  </label>
                  <div className="relative">
                    <select
                      id="discom"
                      value={discom}
                      disabled={!discoms?.length && discomsLoading}
                      onChange={(e) => {
                        setDiscom(e.target.value);
                        reset();
                      }}
                      className="harihar-select w-full disabled:opacity-50"
                    >
                      {discomsLoading && <option value="">Loading…</option>}
                      {!discomsLoading && discomsError && <option value="">Could not load DISCOMs</option>}
                      {!discomsLoading && !discomsError && !discoms?.length && <option value="">No DISCOMs for state</option>}
                      {discoms?.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                    {discomsLoading && (
                      <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Roof type</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ROOF_TYPES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoofType(r.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left text-xs transition-all duration-200",
                        roofType === r.id
                          ? "border-cyan-400/50 bg-cyan-500/15 text-white shadow-lg shadow-cyan-500/10"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="block font-semibold text-slate-100">{r.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{r.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!canSubmit || isMutating}
                onClick={() => void runEstimate()}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 py-4 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
              >
                {isMutating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Running your numbers…
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Calculate savings
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {isMutating && (
              <motion.div
                key="sk"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="mb-4 h-4 w-40 animate-pulse rounded-full bg-white/10" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              </motion.div>
            )}

            {error && !isMutating && (
              <motion.div
                key="err"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-red-500/30 bg-red-950/40 p-5 text-sm text-red-100 backdrop-blur-xl"
              >
                <p className="font-semibold">We couldn&apos;t complete that estimate</p>
                <p className="mt-2 text-red-200/90">{error.message}</p>
                <button
                  type="button"
                  onClick={() => void runEstimate()}
                  className="mt-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-500/30"
                >
                  Try again
                </button>
              </motion.div>
            )}

            {estimates && !isMutating && (
              <motion.div
                key="res"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 18 }}
                className="space-y-6"
              >
                <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white/[0.07] to-emerald-950/20 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-200/90">Your estimate</h2>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-slate-400">
                      Engine v{data?.engineVersion} · {data?.tariff.discomLabel}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                      label="Recommended solar size"
                      value={estimates.recommendedSystemKw}
                      suffix=" kW"
                      decimals={1}
                      accent="from-cyan-400 to-teal-500"
                    />
                    <MetricCard
                      label="Est. yearly generation"
                      value={estimates.estimatedAnnualGenerationKwh}
                      suffix=" kWh"
                      accent="from-amber-400 to-orange-500"
                    />
                    <MetricCard
                      label="Est. annual savings"
                      value={estimates.estimatedAnnualSavingsInr}
                      prefix="₹"
                      accent="from-emerald-400 to-green-500"
                    />
                    <MetricCard
                      label="Central subsidy (model)"
                      value={estimates.centralSubsidyInr}
                      prefix="₹"
                      accent="from-violet-400 to-indigo-500"
                    />
                    <MetricCard
                      label="Payback period"
                      value={estimates.estimatedPaybackYears}
                      suffix=" yrs"
                      decimals={1}
                      accent="from-sky-400 to-blue-500"
                    />
                    <MetricCard
                      label="25-year savings (model)"
                      value={estimates.estimatedTwentyFiveYearSavingsInr}
                      prefix="₹"
                      accent="from-fuchsia-400 to-pink-500"
                    />
                  </div>
                  {data?.warnings?.length ? (
                    <ul className="mt-4 space-y-1 text-[11px] text-amber-200/90">
                      {data.warnings.map((w) => (
                        <li key={w}>• {w}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
                    <BillSavingsChart
                      currentBill={estimates.modelCurrentMonthlyBillInr}
                      newBill={estimates.modelNewMonthlyBillInr}
                      monthlySavings={estimates.estimatedMonthlySavingsInr}
                    />
                  </div>
                  <TwentyFiveYearSpark annualSavings={estimates.estimatedAnnualSavingsInr} />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={proposalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
                  >
                    <MessageCircle className="h-5 w-5 text-emerald-400" />
                    Get detailed proposal
                  </a>
                  <a
                    href={buildWaLink(`Hi Harihar Solar — quick question about solar for ${state}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:brightness-110"
                  >
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp us
                  </a>
                </div>

                <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
                  <h3 className="text-sm font-semibold text-white">Get a callback</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Share your details — our team will reach out with a tailored proposal. Same numbers you see here go into
                    your CRM record.
                  </p>
                  {leadOk ? (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      Thank you — we&apos;ll contact you shortly.
                    </div>
                  ) : (
                    <form onSubmit={submitLead} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        required
                        minLength={2}
                        placeholder="Full name"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="harihar-input sm:col-span-2"
                      />
                      <input
                        required
                        inputMode="tel"
                        placeholder="Phone (WhatsApp preferred)"
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className="harihar-input"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className="harihar-input"
                      />
                      {leadErr && <p className="sm:col-span-2 text-xs text-red-300">{leadErr}</p>}
                      <button
                        type="submit"
                        disabled={leadBusy}
                        className="sm:col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/15 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
                      >
                        {leadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Send my estimate to Harihar Solar
                      </button>
                    </form>
                  )}
                </section>

                <ul className="space-y-2 rounded-2xl border border-white/5 bg-black/20 p-4 text-[11px] leading-relaxed text-slate-500">
                  {(data?.disclaimers ?? []).map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <PlatformBrandBadge surface="acquisition_calculator" className="border-t border-white/5 pt-6" />
          <p className="mt-2 text-center text-[10px] text-slate-600">
            {HARIHAR_BRAND.displayName} · Satna, Madhya Pradesh
          </p>
        </div>
      </div>

      <style jsx global>{`
        .harihar-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 9999px;
          background: linear-gradient(90deg, rgba(45, 212, 191, 0.35), rgba(56, 189, 248, 0.35));
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .harihar-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(145deg, #f8fafc, #cbd5e1);
          border: 2px solid rgba(45, 212, 191, 0.8);
          box-shadow: 0 4px 20px rgba(34, 211, 238, 0.35);
          cursor: pointer;
        }
        .harihar-range::-moz-range-thumb {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(145deg, #f8fafc, #cbd5e1);
          border: 2px solid rgba(45, 212, 191, 0.8);
          box-shadow: 0 4px 20px rgba(34, 211, 238, 0.35);
          cursor: pointer;
        }
        .harihar-select,
        .harihar-input {
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #f1f5f9;
          padding: 0.65rem 0.85rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .harihar-select:focus,
        .harihar-input:focus {
          border-color: rgba(45, 212, 191, 0.45);
          box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
        }
        .harihar-select option {
          background: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  label,
  value,
  prefix,
  suffix,
  decimals,
  accent
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className={cn("pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl", accent)} />
      <p className="relative text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="relative mt-2 font-mono text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {prefix}
        <AnimatedInr value={value} decimals={decimals} />
        {suffix}
      </p>
    </div>
  );
}
