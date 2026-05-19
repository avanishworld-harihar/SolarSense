"use client";

/**
 * Lean Quotation Builder — Wave 2 P5.
 *
 * Scope: BOM line items + total price + payment terms only.
 * Does NOT run the full solar calculation engine.
 * Designed for rapid turnaround quotes sent via WhatsApp.
 *
 * Flow:
 *   1. Fill customer name + phone + site address
 *   2. Enter system size + key cost line items
 *   3. Add payment terms (text area)
 *   4. "Create & Share" → POST /api/quotations → opens WhatsApp deeplink
 *
 * Marketplace guard: no seller/commission/marketplace fields are present.
 */

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { WorkspacePage } from "@/components/workspace/workspace-page";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

// ─── Line item ────────────────────────────────────────────────────────────

type LineItem = {
  id: string;
  label: string;
  qty: number;
  rate: number;
};

function newLine(): LineItem {
  return { id: crypto.randomUUID(), label: "", qty: 1, rate: 0 };
}

// ─── WhatsApp deeplink ────────────────────────────────────────────────────

function buildWhatsAppUrl(phone: string | null, shareToken: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://sol52.app";
  const url = `${origin}/quote/${shareToken}`;
  const text = encodeURIComponent(`Your solar quotation is ready — view it here:\n${url}`);
  if (phone) {
    const cleaned = phone.replace(/\D/g, "");
    const e164 = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    return `https://wa.me/${e164}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

const DEFAULT_TERMS = `Payment terms:
• 50% advance at order confirmation
• 40% before equipment delivery
• 10% on commissioning

Validity: 30 days from date of issue.`;

export default function QuotationBuilderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const toast = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [systemKw, setSystemKw] = useState<string>("50");
  const [subsidy, setSubsidy] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), label: "Solar Panels (Tier 1, 545 Wp)", qty: 92, rate: 12000 },
    { id: crypto.randomUUID(), label: "String Inverter (3-phase)", qty: 1, rate: 85000 },
    { id: crypto.randomUUID(), label: "Structure (GI, 5° tilt)", qty: 1, rate: 60000 },
    { id: crypto.randomUUID(), label: "DC/AC wiring & accessories", qty: 1, rate: 25000 },
    { id: crypto.randomUUID(), label: "Installation & commissioning", qty: 1, rate: 30000 },
  ]);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [validityDays, setValidityDays] = useState("30");
  const [saving, setSaving] = useState(false);

  // ── Calculations ───────────────────────────────────────────────────────────

  const hardware = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.rate, 0),
    [lines]
  );
  const subsidyVal = useMemo(() => {
    const n = parseFloat(subsidy);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [subsidy]);
  const discountVal = useMemo(() => {
    const n = parseFloat(discount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [discount]);
  const finalAmount = useMemo(
    () => Math.max(0, hardware - subsidyVal - discountVal),
    [hardware, subsidyVal, discountVal]
  );

  // ── Line item actions ──────────────────────────────────────────────────────

  const updateLine = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, newLine()]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!customerName.trim()) {
      toast.push({ tone: "error", title: "Customer name is required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          site_address: siteAddress.trim() || null,
          system_kw: parseFloat(systemKw) || null,
          hardware_inr: hardware,
          subsidy_inr: subsidyVal || null,
          discount_inr: discountVal || null,
          final_amount_inr: finalAmount,
          payment_terms: terms.trim() || null,
          validity_days: parseInt(validityDays, 10) || 30,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; data?: { id: string; share_token: string }; error?: string };
      if (!res.ok || !j.ok || !j.data) throw new Error(j.error ?? "create_failed");

      toast.success("Quotation created", "Opening WhatsApp to share…");

      // Open WhatsApp deeplink
      const waUrl = buildWhatsAppUrl(customerPhone || null, j.data.share_token);
      window.open(waUrl, "_blank", "noopener,noreferrer");

      // Navigate to the quotation (will 404 until /quote route is built)
      router.push(`/proposals`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.push({ tone: "error", title: "Failed to create quotation", description: msg });
    } finally {
      setSaving(false);
    }
  }, [
    customerName, customerPhone, siteAddress, systemKw,
    hardware, subsidyVal, discountVal, finalAmount,
    terms, validityDays, router, toast,
  ]);

  return (
    <WorkspacePage tone="proposals">
      <div className="mx-auto max-w-3xl space-y-6 pb-10 pt-1">
        {/* Header */}
        <ProposalHubHeader
          variant="workspace"
          title="New Quotation"
          subtitle="BOM · Price · Terms — share via WhatsApp"
          backHref="/proposals"
          backLabel={t("proposals_backToHub")}
        />

        {/* ── Customer details ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Customer
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingLabelInput
              label="Customer / Company name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
            />
            <FloatingLabelInput
              label="Mobile number (WhatsApp)"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="mt-4">
            <FloatingLabelInput
              label="Site address (for cover page)"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
            />
          </div>
        </section>

        {/* ── System size ───────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            System
          </p>
          <div className="max-w-[12rem]">
            <FloatingLabelInput
              label="System size (kW)"
              type="number"
              min={1}
              step={0.5}
              value={systemKw}
              onChange={(e) => setSystemKw(e.target.value)}
            />
          </div>
        </section>

        {/* ── BOM line items ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bill of materials
            </p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          {/* Header row — desktop */}
          <div className="mb-2 hidden grid-cols-[1fr_6rem_8rem_6rem] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid dark:text-slate-500">
            <span>Item</span>
            <span>Qty</span>
            <span>Rate (₹)</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Line item description"
                  value={line.label}
                  onChange={(e) => updateLine(line.id, "label", e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => updateLine(line.id, "qty", parseFloat(e.target.value) || 1)}
                  className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
                <input
                  type="number"
                  min={0}
                  value={line.rate}
                  onChange={(e) => updateLine(line.id, "rate", parseFloat(e.target.value) || 0)}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-right text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
                <span className="w-24 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  ₹{(line.qty * line.rate).toLocaleString("en-IN")}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  aria-label="Remove line"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Subtotals */}
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-white/10">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Hardware + Installation</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                ₹{hardware.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40 text-sm text-slate-600 dark:text-slate-400">Subsidy (₹)</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={subsidy}
                onChange={(e) => setSubsidy(e.target.value)}
                className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-sm text-emerald-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-emerald-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40 text-sm text-slate-600 dark:text-slate-400">Discount (₹)</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-sm text-amber-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-amber-400"
              />
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 dark:border-white/10">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Net payable</span>
              <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">
                ₹{finalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </section>

        {/* ── Payment terms ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payment terms
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Valid for</span>
              <input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">days</span>
            </div>
          </div>
          <textarea
            rows={6}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Enter payment terms, warranty, scope of work…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </section>

        {/* ── Marketplace placeholder (P10 stub) ───────────────────────── */}
        <section
          aria-label="Marketplace — coming soon"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-5 py-4",
            "dark:border-white/10"
          )}
        >
          <Building2 className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Marketplace — <span className="font-semibold text-slate-700 dark:text-slate-300">Coming soon</span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Compare brands, get competitive quotes, and transact — all inside SOL.52.
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
            SOON
          </span>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="min-h-12 w-full gap-2 font-semibold sm:w-auto sm:min-w-[15rem]"
            onClick={() => void handleCreate()}
            disabled={saving || !customerName.trim()}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {saving ? "Creating…" : "Create & Share via WhatsApp"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 w-full gap-2 font-medium sm:w-auto"
            onClick={() => router.push("/proposals")}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </WorkspacePage>
  );
}
