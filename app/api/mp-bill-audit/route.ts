import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditMpBill, auditMpBillsBatch, type MpBillAuditOptions } from "@/lib/mp-bill-audit";
import { saveMpBillAuditRecord } from "@/lib/mp-bill-audit-persistence";
import type { ParsedBillShape } from "@/lib/bill-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const auditOptionsSchema = z.object({
  fppasPct: z.number().min(-1).max(1).optional(),
  paidOnline: z.boolean().optional(),
  advanceBalanceInr: z.number().min(0).max(1_000_000).optional(),
  sanctionedLoadKwOverride: z.number().min(0.1).max(1000).optional()
});

const parsedBillLooseSchema = z.record(z.string(), z.unknown());

const singleSchema = z.object({
  mode: z.literal("single").optional(),
  parsedBill: parsedBillLooseSchema,
  options: auditOptionsSchema.optional(),
  /** Optional Supabase persistence keys. */
  clientRef: z.string().max(120).optional().nullable(),
  leadId: z.string().max(120).optional().nullable(),
  persist: z.boolean().optional()
});

const batchSchema = z.object({
  mode: z.literal("batch"),
  bills: z
    .array(
      z.object({
        parsedBill: parsedBillLooseSchema,
        options: auditOptionsSchema.optional(),
        clientRef: z.string().max(120).optional().nullable(),
        leadId: z.string().max(120).optional().nullable()
      })
    )
    .min(1)
    .max(50),
  persist: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    // Auto-detect mode.
    if (Array.isArray((json as { bills?: unknown }).bills)) {
      const body = batchSchema.parse({ ...json, mode: "batch" });
      const reports = auditMpBillsBatch(
        body.bills.map((b) => ({
          parsed: b.parsedBill as ParsedBillShape,
          options: (b.options as MpBillAuditOptions | undefined) ?? undefined
        }))
      );

      let saved = 0;
      if (body.persist) {
        for (let i = 0; i < reports.length; i += 1) {
          const ok = await saveMpBillAuditRecord({
            report: reports[i],
            clientRef: body.bills[i]?.clientRef ?? null,
            leadId: body.bills[i]?.leadId ?? null
          });
          if (ok) saved += 1;
        }
      }

      return NextResponse.json(
        { ok: true, count: reports.length, saved, reports },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = singleSchema.parse(json);
    const report = auditMpBill(body.parsedBill as ParsedBillShape, body.options as MpBillAuditOptions | undefined);
    let persisted = false;
    if (body.persist) {
      persisted = await saveMpBillAuditRecord({
        report,
        clientRef: body.clientRef ?? null,
        leadId: body.leadId ?? null
      });
    }

    return NextResponse.json(
      { ok: true, report, persisted },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : e instanceof Error
          ? e.message
          : "MP bill audit failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
