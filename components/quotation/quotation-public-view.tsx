"use client";

/**
 * QuotationPublicView — the public /quote/[token] artifact.
 *
 * Rendered for the customer (unauthenticated) with:
 *   - Installer header (SOL.52 brand)
 *   - Customer name + site address
 *   - System size + net payable (hero metrics)
 *   - Validity countdown
 *   - Payment terms (formatted)
 *   - WhatsApp reply CTA
 *   - Marketplace-ready chip (P10 placeholder — UI only, no schema)
 *
 * Design: premium light card, no heavy glassmorphism (customer-facing, not OS UI).
 */

import { useMemo } from "react";
import { CheckCircle2, Clock, MessageCircle, Zap } from "lucide-react";
import type { QuotationRow } from "@/lib/quotations-store";
import { cn } from "@/lib/utils";

// ─── Validity countdown ────────────────────────────────────────────────────

function validityLabel(expiresAt: string | null, validityDays: number): string {
  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Expired";
    if (days === 1) return "Expires today";
    return `Valid for ${days} more days`;
  }
  return `Valid for ${validityDays} days from date of issue`;
}

// ─── Status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QuotationRow["status"] }) {
  const cfg = {
    draft: { label: "Draft", class: "bg-slate-100 text-slate-600" },
    sent: { label: "Sent", class: "bg-sky-50 text-sky-700" },
    viewed: { label: "Viewed", class: "bg-violet-50 text-violet-700" },
    accepted: { label: "Accepted", class: "bg-emerald-50 text-emerald-700" },
    rejected: { label: "Rejected", class: "bg-red-50 text-red-700" },
    expired: { label: "Expired", class: "bg-slate-100 text-slate-500" },
  }[status] ?? { label: status, class: "bg-slate-100 text-slate-600" };

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.class)}>
      {cfg.label}
    </span>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function QuotationPublicView({ quotation: q }: { quotation: QuotationRow }) {
  const isAccepted = q.status === "accepted";
  const isExpired = q.status === "expired";

  const validityStr = useMemo(
    () => validityLabel(q.expires_at, q.validity_days),
    [q.expires_at, q.validity_days]
  );

  const whatsAppReplyUrl = useMemo(() => {
    if (!q.customer_phone) return null;
    const cleaned = q.customer_phone.replace(/\D/g, "");
    const e164 = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    const text = encodeURIComponent(`Hi, I've reviewed the quotation for ${q.customer_name}. `);
    return `https://wa.me/${e164}?text=${text}`;
  }, [q.customer_phone, q.customer_name]);

  const createdDateStr = useMemo(() => {
    try {
      return new Date(q.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [q.created_at]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700">SOL.52 Solar</span>
          </div>
          <StatusBadge status={q.status} />
        </div>

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Solar Quotation
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {q.customer_name}
          </h1>
          {q.site_address && (
            <p className="mt-1 text-sm text-slate-500">{q.site_address}</p>
          )}
          <p className="mt-2 text-xs text-slate-400">{createdDateStr}</p>

          {/* Key metrics */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
            {q.system_kw != null && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  System size
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {q.system_kw} kW
                </p>
              </div>
            )}
            {q.final_amount_inr != null && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Net payable
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-teal-700">
                  ₹{Math.round(q.final_amount_inr).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {q.subsidy_inr != null && q.subsidy_inr > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  PM Subsidy
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                  −₹{Math.round(q.subsidy_inr).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Validity ──────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3",
            isExpired
              ? "border-red-200 bg-red-50"
              : isAccepted
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
          )}
        >
          {isAccepted ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          )}
          <p
            className={cn(
              "text-sm font-medium",
              isExpired
                ? "text-red-700"
                : isAccepted
                  ? "text-emerald-700"
                  : "text-amber-700"
            )}
          >
            {validityStr}
          </p>
        </div>

        {/* ── Payment terms ─────────────────────────────────────────────── */}
        {q.payment_terms && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payment terms
            </p>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {q.payment_terms}
            </pre>
          </div>
        )}

        {/* ── Marketplace-ready chip (P10 placeholder) ──────────────────── */}
        <div className="flex items-center gap-2 rounded-xl border border-teal-200/60 bg-teal-50/60 px-4 py-3 dark:border-teal-700/30 dark:bg-teal-500/8">
          <Zap className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
          <p className="text-[12px] font-medium text-teal-700 dark:text-teal-300">
            Marketplace-ready — verified equipment, competitive pricing.
          </p>
          <span className="ml-auto shrink-0 rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
            SOON
          </span>
        </div>

        {/* ── WhatsApp reply CTA ────────────────────────────────────────── */}
        {whatsAppReplyUrl && !isExpired && (
          <a
            href={whatsAppReplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Reply on WhatsApp
          </a>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400">
          Generated by SOL.52 — India&apos;s Solar Business OS
        </p>
      </div>
    </div>
  );
}
