/**
 * Proposal Preset Engine — drives which blocks appear, in what order,
 * and which inputs are required for each proposal type.
 *
 * Presets are CONFIGURATION, not logic. They declare intent; the compiler
 * in proposal-document-ir.ts assembles the final ProposalDocument.
 *
 * Phase A presets:
 *   1. residential_smart     — residential rooftop (bill or requirement path)
 *   2. commercial_executive  — C&I/commercial (no bill required)
 *
 * Future presets (Phase B+):
 *   - industrial_preliminary
 *   - financing_special
 *   - luxury_residential
 */

import type { ProposalBlockId } from "@/lib/proposal-block-registry";
import { DEFAULT_PROPOSAL_BLOCK_ORDER, PROPOSAL_BLOCK_REGISTRY } from "@/lib/proposal-block-registry";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { getStoryCopy, type StoryMode, type StorySegment, type StoryCopy, type StoryLang } from "@/lib/proposal-story-copy";

// ─── Preset identifiers ──────────────────────────────────────────────────────

export const PROPOSAL_PRESET_IDS = [
  "residential_smart",
  "commercial_executive",
] as const;

export type ProposalPresetId = (typeof PROPOSAL_PRESET_IDS)[number];

export function isValidPresetId(id: unknown): id is ProposalPresetId {
  return typeof id === "string" && PROPOSAL_PRESET_IDS.includes(id as ProposalPresetId);
}

export function normalizePresetId(raw: string | null | undefined): ProposalPresetId {
  if (raw && isValidPresetId(raw)) return raw;
  return "residential_smart";
}

// ─── Preset shape ────────────────────────────────────────────────────────────

export type BillRequirement = "required" | "optional" | "not_applicable";
export type ThemeHint = "residential" | "commercial";

export type ProposalPreset = {
  id: ProposalPresetId;
  /** Human label. i18n key: `preset_label_${id}` */
  label: string;
  description: string;
  /**
   * `required`        — bill upload or manual monthly units must be provided.
   * `optional`        — works with or without bill (residential default).
   * `not_applicable`  — commercial path; bill is never expected.
   */
  bill_requirement: BillRequirement;
  /** Block IDs included and enabled by default for this preset. */
  default_blocks: ProposalBlockId[];
  /** Block IDs supported by this preset but off by default. */
  optional_blocks: ProposalBlockId[];
  /** Visual theme hint — renderers use this to apply appropriate styling. */
  theme_hint: ThemeHint;
  /**
   * Whether the `dataSource` field defaults to "bill" or "requirement" for this preset
   * when not explicitly specified by the builder.
   */
  default_data_source: "bill" | "requirement";
};

// ─── Preset registry ─────────────────────────────────────────────────────────

export const PROPOSAL_PRESET_REGISTRY: Record<ProposalPresetId, ProposalPreset> = {
  residential_smart: {
    id: "residential_smart",
    label: "Residential Smart Proposal",
    description:
      "Complete proposal for residential rooftop solar. " +
      "Supports both bill-backed (with electricity bill) and requirement-based " +
      "(from solar sizing form) paths through the same document engine.",
    bill_requirement: "optional",
    theme_hint: "residential",
    default_data_source: "bill",
    default_blocks: [
      "cover_page",
      "about_company",
      "technical_proposal",
      "technical_specifications",
      "bom_material_list",
      "financial_summary",
      "roi_savings",
      "warranty",
      "payment_terms",
      "terms_conditions",
      "project_gallery",
      "customer_documents_required",
      "amc_maintenance",
    ],
    optional_blocks: [],
  },

  commercial_executive: {
    id: "commercial_executive",
    label: "Commercial Executive Proposal",
    description:
      "Executive-grade proposal for C&I / commercial / industrial rooftop solar. " +
      "Bill upload is not required — system sizing is based on declared load requirement. " +
      "Tailored for decision-makers: lean, impact-first, commercially sharp.",
    bill_requirement: "not_applicable",
    theme_hint: "commercial",
    default_data_source: "requirement",
    default_blocks: [
      "cover_page",
      "about_company",
      "technical_proposal",
      "technical_specifications",
      "bom_material_list",
      "financial_summary",
      "roi_savings",
      "payment_terms",
      "warranty",
      "terms_conditions",
      "project_gallery",
      "amc_maintenance",
    ],
    optional_blocks: ["customer_documents_required", "brand_comparison_card"],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the full ordered block playlist for a preset as a `ProposalTemplateV1`.
 * Default-on blocks are `enabled: true`; optional blocks are `enabled: false`.
 * Any registry block not in the preset's lists is appended as disabled.
 */
export function getPresetDefaultLayout(presetId: ProposalPresetId): ProposalTemplateV1 {
  const preset = PROPOSAL_PRESET_REGISTRY[presetId];
  const defaultSet = new Set<ProposalBlockId>(preset.default_blocks);
  const optionalSet = new Set<ProposalBlockId>(preset.optional_blocks);

  // Ordered: default blocks first (in preset order), optional blocks, then remaining.
  const seen = new Set<ProposalBlockId>();
  const ordered: Array<{ id: ProposalBlockId; enabled: boolean }> = [];

  for (const id of preset.default_blocks) {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push({ id, enabled: true });
    }
  }
  for (const id of preset.optional_blocks) {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push({ id, enabled: false });
    }
  }
  for (const id of DEFAULT_PROPOSAL_BLOCK_ORDER) {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push({ id, enabled: PROPOSAL_BLOCK_REGISTRY[id].defaultEnabled && defaultSet.has(id) });
    }
  }

  void optionalSet; // referenced above; suppress unused-var
  return { version: 1, blocks: ordered };
}

/**
 * Returns a human-readable label for a preset, falling back gracefully.
 */
export function getPresetLabel(presetId: string): string {
  const p = PROPOSAL_PRESET_REGISTRY[presetId as ProposalPresetId];
  return p?.label ?? presetId;
}

/**
 * Returns true when the preset does NOT require a bill / monthly units.
 * Used by the builder to show/hide bill-upload UI.
 */
export function presetRequiresBill(presetId: ProposalPresetId): boolean {
  return PROPOSAL_PRESET_REGISTRY[presetId].bill_requirement === "required";
}

export function presetSupportsBill(presetId: ProposalPresetId): boolean {
  const req = PROPOSAL_PRESET_REGISTRY[presetId].bill_requirement;
  return req === "required" || req === "optional";
}

// ─── Wave 3 P6: Story mode variant resolution ─────────────────────────────
//
// Resolves the narrative copy for a commercial proposal given:
//   - segment: the customer's org type (hotel, hospital, factory, …)
//   - mode: the story narrative chosen by the installer
//   - lang: the proposal language (hi or en)
//
// Returns null when:
//   - presetId is not commercial_executive (story modes are commercial-only)
//   - segment or mode is null/undefined (no story mode selected)
//   - the combination has no copy defined
//
// Callers should fall back to their own built-in copy when this returns null.

export type StoryVariant = StoryCopy & {
  segment: StorySegment;
  mode: StoryMode;
  lang: StoryLang;
};

/**
 * Returns the resolved story copy for a commercial proposal,
 * or null if no story mode is configured.
 */
export function resolveStoryVariant(
  presetId: ProposalPresetId | string,
  segment: StorySegment | string | null | undefined,
  mode: StoryMode | string | null | undefined,
  lang: StoryLang | string
): StoryVariant | null {
  if (presetId !== "commercial_executive") return null;
  if (!segment || !mode) return null;

  const VALID_SEGMENTS: StorySegment[] = ["hotel", "hospital", "factory", "warehouse", "dairy", "school"];
  const VALID_MODES: StoryMode[] = ["executive_pitch", "cfo_brief", "operations_brief", "sustainability_story"];

  if (!VALID_SEGMENTS.includes(segment as StorySegment)) return null;
  if (!VALID_MODES.includes(mode as StoryMode)) return null;

  const storyLang: StoryLang = lang === "hi" ? "hi" : "en";
  const copy = getStoryCopy(segment as StorySegment, mode as StoryMode, storyLang);
  if (!copy) return null;

  return {
    ...copy,
    segment: segment as StorySegment,
    mode: mode as StoryMode,
    lang: storyLang,
  };
}
