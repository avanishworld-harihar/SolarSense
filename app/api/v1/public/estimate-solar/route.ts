import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  estimateHomeownerSolar,
  PUBLIC_SOLAR_ENGINE_VERSION,
  PUBLIC_SOLAR_ENGINE_SCHEME
} from "@/lib/public-solar-calculator";
import { platformBrandBlock } from "@/lib/platform-branding";

export const dynamic = "force-dynamic";

const postBodySchema = z
  .object({
    state: z.string().min(2).max(80),
    discom: z.string().min(1).max(120).nullish(),
    billMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .nullish(),
    areaProfile: z.enum(["urban", "rural"]).nullish(),
    averageMonthlyKwh: z.number().positive().max(50_000).nullish(),
    annualConsumptionKwh: z.number().positive().max(600_000).nullish(),
    averageMonthlyBillInr: z.number().positive().max(500_000).nullish()
  })
  .strict();

/**
 * Homeowner / acquisition-brand solar estimate (canonical public calculator engine).
 * Wraps `calculateSolar` with uniform monthly consumption — same core math as installer flows.
 *
 * `GET` — engine metadata + request shape (for API discovery; no secrets).
 * `POST` — run estimate (JSON body). No acquisition UI in this repo.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      engineVersion: PUBLIC_SOLAR_ENGINE_VERSION,
      scheme: PUBLIC_SOLAR_ENGINE_SCHEME,
      branding: platformBrandBlock("public_api"),
      description:
        "Consumer-facing estimate for acquisition brands. Uses simple inputs and the same SOL.52 solar engine as the installer product.",
      post: {
        path: "/api/v1/public/estimate-solar",
        method: "POST",
        contentType: "application/json",
        bodySchema: {
          state: "string (required) — e.g. Madhya Pradesh",
          discom: "string (optional, recommended) — DISCOM code or name",
          billMonth: "string (optional) — YYYY-MM for FY-sensitive tariffs",
          areaProfile: '"urban" | "rural" (optional) — domestic fixed model where applicable',
          averageMonthlyKwh: "number (optional) — average units/month",
          annualConsumptionKwh: "number (optional) — total kWh/year",
          averageMonthlyBillInr: "number (optional) — approximate monthly bill ₹",
          rule: "Provide exactly one of averageMonthlyKwh, annualConsumptionKwh, or averageMonthlyBillInr"
        }
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const b = parsed.data;
    const out = await estimateHomeownerSolar({
      state: b.state,
      discom: b.discom ?? undefined,
      billMonth: b.billMonth ?? undefined,
      areaProfile: b.areaProfile ?? undefined,
      averageMonthlyKwh: b.averageMonthlyKwh ?? undefined,
      annualConsumptionKwh: b.annualConsumptionKwh ?? undefined,
      averageMonthlyBillInr: b.averageMonthlyBillInr ?? undefined
    });
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Estimate failed";
    const isClient = /provide exactly one|only one of|must be positive|could not infer/i.test(message);
    return NextResponse.json({ ok: false, error: message }, { status: isClient ? 400 : 500 });
  }
}
