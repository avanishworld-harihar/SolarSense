import { z } from "zod";

/**
 * Sol.52 — shared zod fragment for the extra fields introduced by the
 * 12-slide proposal overhaul (multilingual, customer profile, EMI, AMC,
 * banking, site photos, etc.). Imported by /api/proposal-ppt and
 * /api/proposals so both endpoints stay in sync.
 */

export const proposalLangSchema = z.enum(["en", "hi"]).optional();

export const customerProfileSchema = z
  .object({
    consumerId: z.string().max(60).optional(),
    meterNumber: z.string().max(60).optional(),
    connectionDate: z.string().max(40).optional(),
    connectionType: z.string().max(120).optional(),
    phase: z.string().max(20).optional(),
    sanctionedLoadKw: z.number().min(0).max(500).optional()
  })
  .optional();

export const financeOptionSchema = z
  .object({
    interestRatePct: z.number().min(0).max(40).optional(),
    tenuresYears: z.array(z.number().int().min(1).max(20)).max(6).optional(),
    selectedTenureYears: z.number().int().min(1).max(20).optional()
  })
  .optional();

export const companyProfileSchema = z
  .object({
    aboutUsParagraphs: z.array(z.string().max(500)).max(6).optional(),
    founded: z.string().max(40).optional(),
    gstNumber: z.string().max(40).optional(),
    locations: z.string().max(160).optional(),
    installationsDone: z.string().max(40).optional(),
    installationsLabel: z.string().max(80).optional(),
    bullets: z.array(z.string().max(160)).max(8).optional()
  })
  .optional();

export const bankDetailsSchema = z
  .object({
    accountName: z.string().max(120).optional(),
    accountNumber: z.string().max(40).optional(),
    ifsc: z.string().max(20).optional(),
    branch: z.string().max(120).optional(),
    upiId: z.string().max(120).optional(),
    /** Uploaded payment QR code image (URL or base64 data-URI). Displayed on the Banking slide. */
    paymentQrCodeUrl: z.string().max(600000).optional()
  })
  .optional();

/**
 * Site photos accept either an http(s) URL or a base64 data-URI.
 * Capped at 6 images (slide 5 uses 3, slide 12 uses 3).
 */
export const siteImagesSchema = z.array(z.string().max(600000)).max(6).optional();

export const amcSelectedYearsSchema = z.union([z.literal(1), z.literal(5), z.literal(10)]).optional();

/**
 * Per-project BOM override entries. Anything omitted keeps the default
 * value from `buildBom()` in lib/proposal-deck-helpers.ts.
 *
 * Used by the "Project Window" workflow: rough proposal uses the default
 * BOM, then the installer can lock in final products before generating
 * the final proposal.
 */
export const bomOverridesSchema = z
  .array(
    z.object({
      slot: z.number().int().min(1).max(20),
      title: z.string().max(120).optional(),
      spec: z.string().max(280).optional(),
      brand: z.string().max(120).optional(),
      warranty: z.string().max(80).optional()
    })
  )
  .max(20)
  .optional();

export const proposalExtrasShape = {
  lang: proposalLangSchema,
  customerProfile: customerProfileSchema,
  financeOption: financeOptionSchema,
  amcSelectedYears: amcSelectedYearsSchema,
  companyProfile: companyProfileSchema,
  bankDetails: bankDetailsSchema,
  siteImages: siteImagesSchema,
  installerLogoUrl: z.string().max(600000).optional(),
  bomOverrides: bomOverridesSchema,
  /** Optional public web URL of this proposal — used by the PPT to render
   *  a "Scan to view this proposal" QR fallback when no site photos exist. */
  webProposalUrl: z.string().max(600).optional()
} as const;
