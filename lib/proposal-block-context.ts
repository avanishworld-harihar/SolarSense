/**
 * BlockRenderContext — the shared props bag passed to every block component
 * by the WebRenderer.
 *
 * All block components receive this shape. They destructure what they need
 * and ignore the rest. This keeps block component signatures clean and ensures
 * the renderer can pass a single context object to any block.
 */

import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import type { ProposalDict, ProposalLang } from "@/lib/proposal-i18n";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import type { ProposalPresetId, StoryVariant } from "@/lib/proposal-preset-engine";

export type BlockRenderContext = {
  // ── Core proposal data ──────────────────────────────────────────────────
  summary: ProposalDeckSummary;
  pptInput: PremiumProposalPptInput;

  // ── i18n ────────────────────────────────────────────────────────────────
  lang: ProposalLang;
  monthLbls: string[];
  D: ProposalDict;

  // ── Display state ───────────────────────────────────────────────────────
  darkMode: boolean;
  honoredDisplay: string;

  // ── Identity ────────────────────────────────────────────────────────────
  proposalId: string;
  presetId: ProposalPresetId;

  // ── Installer ───────────────────────────────────────────────────────────
  installer: { name: string; contact: string; tagline: string };
  installerLogoUrl?: string;

  // ── Media ───────────────────────────────────────────────────────────────
  siteImages?: string[];

  // ── Eligibility signals ─────────────────────────────────────────────────
  /**
   * True when the proposal was generated from uploaded bill / monthly units.
   * False = requirement-based path (no bill).
   * Drives visibility of bill-audit and economics sections.
   */
  billAuditBacked: boolean;
  showSurveyWorkflowSection?: boolean;

  // ── Interactive callbacks ───────────────────────────────────────────────
  selectedAmcYears: 1 | 5 | 10;
  onAmcChange: (y: 1 | 5 | 10) => void;
  onShare: () => void;
  onDownload: () => void;
  downloading: boolean;

  // ── Wave 3 P6: Story mode variant ──────────────────────────────────────
  /**
   * Resolved narrative copy for commercial proposals with a story mode selected.
   * Null when no story mode is configured (use built-in block copy instead).
   */
  storyVariant?: StoryVariant | null;

  /** C&I configuration — panel, DCR, scenarios, financing */
  commercialConfig?: CommercialProposalConfig | null;
};

// ─── Eligibility context (subset used by the registry) ───────────────────────

export type BlockEligibilityContext = {
  billAuditBacked: boolean;
  presetId: ProposalPresetId;
  showSurveySection?: boolean;
};

export type BlockEligibilityFn = (ctx: BlockEligibilityContext) => boolean;

/** Convenience — a block that is always eligible regardless of context. */
export const ALWAYS_ELIGIBLE: BlockEligibilityFn = () => true;
