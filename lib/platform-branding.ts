/**
 * Multi-brand platform branding — canonical copy and surface rules for SOL.52
 * (ecosystem layer) vs local acquisition brands (e.g. Harihar Solar).
 *
 * Import this module from acquisition UIs, public API handlers, and (later)
 * shared packages for external brand repos. Do not duplicate strings in brand sites.
 *
 * Architecture: docs/ACQUISITION_BRANDING_ARCHITECTURE.md
 */

import { APP_LOGO_SRC, APP_TAGLINE } from "@/lib/app-brand";

/** Legal / product name of the platform layer (always “SOL.52” in customer-facing acquisition copy). */
export const PLATFORM_NAME = "SOL.52" as const;

/** Installer app name when distinguishing from platform (internal / app store). */
export const INSTALLER_APP_NAME = "Sol.52" as const;

/** Primary platform tagline (also used in installer app). */
export const PLATFORM_TAGLINE = APP_TAGLINE;

/** Standard acquisition footer — calculators, widgets, embeds. */
export const POWERED_BY_LINE = `Powered by ${PLATFORM_NAME}` as const;

/** Deeper product credit for tool headers, API metadata, and “how it works” blocks. */
export const INTELLIGENCE_ENGINE_LINE = `${PLATFORM_NAME} Intelligence Engine` as const;

/** Customer-facing proposal / quote PDF or web deck — platform credit (installer remains hero). */
export const PROPOSAL_PLATFORM_CREDIT = POWERED_BY_LINE;

/** Installer-generated proposal — minimal platform footer (see docs § proposal surfaces). */
export const PROPOSAL_INSTALLER_FOOTER = `Powered by ${INSTALLER_APP_NAME}`;

export const PLATFORM_LOGO_SRC = APP_LOGO_SRC;

/** Which UI or API surface is rendering platform branding (drives copy variant). */
export type PlatformBrandSurface =
  | "acquisition_calculator"
  | "acquisition_landing"
  | "acquisition_lead_form"
  | "public_api"
  | "customer_proposal"
  | "installer_proposal"
  | "installer_app";

export type PlatformBrandBlock = {
  platformName: typeof PLATFORM_NAME;
  poweredBy: typeof POWERED_BY_LINE;
  intelligenceEngine: typeof INTELLIGENCE_ENGINE_LINE;
  tagline: typeof PLATFORM_TAGLINE;
  logoSrc: typeof PLATFORM_LOGO_SRC;
  surface: PlatformBrandSurface;
};

/** Serializable block for JSON API responses (acquisition clients, Harihar BFF, etc.). */
export function platformBrandBlock(surface: PlatformBrandSurface): PlatformBrandBlock {
  return {
    platformName: PLATFORM_NAME,
    poweredBy: POWERED_BY_LINE,
    intelligenceEngine: INTELLIGENCE_ENGINE_LINE,
    tagline: PLATFORM_TAGLINE,
    logoSrc: PLATFORM_LOGO_SRC,
    surface
  };
}

/**
 * Registered acquisition brand (expand via config/DB in Phase G).
 * External repos should mirror `slug` in `source_meta.acquisition_brand_slug`.
 */
export type AcquisitionBrandSlug = "harihar_solar";

export type AcquisitionBrandDefinition = {
  slug: AcquisitionBrandSlug;
  displayName: string;
  /** Primary org routing target once `acquisition_brands` table exists. */
  organizationHint?: string;
  defaultState?: string;
  /** Public marketing domain when known (documentation / deep links). */
  siteUrl?: string;
};

/** In-repo reference registry — first brand; add rows here until Phase G DB registry ships. */
export const ACQUISITION_BRANDS: Record<AcquisitionBrandSlug, AcquisitionBrandDefinition> = {
  harihar_solar: {
    slug: "harihar_solar",
    displayName: "Harihar Solar",
    organizationHint: "Harihar Solar",
    defaultState: "Madhya Pradesh",
    siteUrl: undefined
  }
};

export function getAcquisitionBrand(slug: AcquisitionBrandSlug): AcquisitionBrandDefinition {
  return ACQUISITION_BRANDS[slug];
}

/** `source_meta` keys for inbound leads from acquisition funnels (stable contract). */
export const ACQUISITION_SOURCE_META_KEYS = {
  brandSlug: "acquisition_brand_slug",
  funnel: "funnel",
  surface: "platform_surface",
  engineVersion: "calculator_engine_version"
} as const;

/** Shared public API path prefix for acquisition-facing services. */
export const PUBLIC_API_V1_PREFIX = "/api/v1/public" as const;

export const PUBLIC_API_ROUTES = {
  estimateSolar: `${PUBLIC_API_V1_PREFIX}/estimate-solar`
} as const;
