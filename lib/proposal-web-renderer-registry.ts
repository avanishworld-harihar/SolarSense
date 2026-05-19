/**
 * Web Renderer Registry — maps each ProposalBlockId to its rendering metadata
 * for the WebRenderer loop.
 *
 * Responsibilities:
 *   1. `eligibility` — decides if a block renders given the current context.
 *   2. `pageDataAttr` — the `data-page` attribute on the `.proposal-page` wrapper.
 *   3. `bridgeKey` — the journeyBridge narrative key shown AFTER this block.
 *   4. `renderKey` — the logical renderer identifier the WebRenderer switches on.
 *
 * The renderKey → React component mapping lives in the WebRenderer itself.
 * This registry is pure data — no React, no imports of UI.
 *
 * Block eligibility rules:
 *   - `cover_page`, `about_company`, `warranty`, `amc_maintenance`, `payment_terms`,
 *     `terms_conditions`, `bom_material_list`, `technical_specifications` → always
 *   - `executive_summary`    → commercial_executive preset only
 *   - `technical_proposal`   → billAuditBacked (mapped to DeepAuditSection)
 *   - `system_requirements`  → !billAuditBacked OR commercial_executive
 *   - `roi_savings`          → billAuditBacked (economics page)
 *   - `payback_analysis`     → commercial_executive preset only
 *   - `project_gallery`      → showSurveySection = true
 *   - `financial_summary`    → always (commercial + residential)
 */

import type { ProposalBlockId } from "@/lib/proposal-block-registry";
import { ALWAYS_ELIGIBLE, type BlockEligibilityContext, type BlockEligibilityFn } from "@/lib/proposal-block-context";

// ─── Render key — maps to specific WebRenderer switch branches ───────────────

/**
 * Each render key corresponds to one or more React components the WebRenderer
 * will instantiate. The key is separate from blockId because some pages combine
 * multiple blocks (e.g. "technical+bom") or have bill/no-bill variants.
 */
export type BlockRenderKey =
  | "cover"
  | "about_company"
  | "executive_summary"
  | "bill_audit"
  | "economics"
  | "system_requirements"
  | "environment"
  | "technical_and_bom"
  | "amc"
  | "commercial_payment"
  | "banking_closing"
  | "survey_workflow"
  | "financial_intelligence"
  | "engineering_rationale"
  | "payback_analysis"
  /** Wave 3 P7 — brand comparison card */
  | "brand_comparison";

export type WebBlockMeta = {
  /** Value for `data-page` attribute on the `.proposal-page` wrapper div. */
  pageDataAttr: string;
  /** Journey bridge text key shown AFTER this block. */
  bridgeKey?: string;
  /** Eligibility function — false = skip this block entirely. */
  eligibility: BlockEligibilityFn;
  /** Which renderer branch to invoke. */
  renderKey: BlockRenderKey;
};

// ─── Eligibility helpers ─────────────────────────────────────────────────────

const billBacked: BlockEligibilityFn = ({ billAuditBacked }) => billAuditBacked;
const noBill: BlockEligibilityFn = ({ billAuditBacked, presetId }) =>
  !billAuditBacked || presetId === "commercial_executive";
const commercialOnly: BlockEligibilityFn = ({ presetId }) => presetId === "commercial_executive";
const surveyOnly: BlockEligibilityFn = ({ showSurveySection }) => Boolean(showSurveySection);

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WEB_RENDERER_REGISTRY: Partial<Record<ProposalBlockId, WebBlockMeta>> = {
  cover_page: {
    pageDataAttr: "cover",
    bridgeKey: "afterCover",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "cover",
  },

  about_company: {
    pageDataAttr: "expertise",
    bridgeKey: "afterTrust",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "about_company",
  },

  /**
   * Executive summary — commercial preset lead section.
   * Shows top-line commercial impact before any technical detail.
   * Only renders for commercial_executive preset.
   */
  executive_summary: {
    pageDataAttr: "executive-summary",
    bridgeKey: "afterExecutive",
    eligibility: commercialOnly,
    renderKey: "executive_summary",
  },

  /**
   * Bill audit (DeepAuditSection) — only when bill data is present.
   * Mapped to block ID `technical_proposal` in the block registry.
   */
  technical_proposal: {
    pageDataAttr: "bill-audit",
    bridgeKey: "afterBill",
    eligibility: billBacked,
    renderKey: "bill_audit",
  },

  /**
   * Economics / ROI page — only when bill data is present.
   * Without bill data, replaced by system_requirements.
   */
  roi_savings: {
    pageDataAttr: "economics",
    bridgeKey: "afterSavings",
    eligibility: billBacked,
    renderKey: "economics",
  },

  /**
   * System requirements — requirement-based path (no bill) or commercial preset.
   * Shows system sizing, generation, coverage, and commercial snapshot.
   */
  system_requirements: {
    pageDataAttr: "system-requirement",
    bridgeKey: "afterRequirement",
    eligibility: noBill,
    renderKey: "system_requirements",
  },

  /**
   * Financial intelligence — commercial-only deep financial analysis.
   * NPV, IRR, payback, cashflow table.
   */
  payback_analysis: {
    pageDataAttr: "payback-analysis",
    bridgeKey: "afterPayback",
    eligibility: commercialOnly,
    renderKey: "payback_analysis",
  },

  /**
   * Technical specs + BOM — always shown.
   * Rendered as a combined page (TechnicalProposalSection + BomSection).
   */
  technical_specifications: {
    pageDataAttr: "technical-bom",
    bridgeKey: "afterImpact",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "technical_and_bom",
  },

  /**
   * BOM material list — shares a page with technical_specifications in the
   * WebRenderer. When it appears immediately after technical_specifications in
   * the layout, the WebRenderer merges them into one `.proposal-page` block.
   * When standalone, it gets its own page wrapper.
   */
  bom_material_list: {
    pageDataAttr: "bom",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "technical_and_bom",
  },

  /**
   * AMC & service — always shown.
   */
  amc_maintenance: {
    pageDataAttr: "amc",
    bridgeKey: "afterSupport",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "amc",
  },

  /**
   * Payment terms + commercial section — combined page.
   */
  payment_terms: {
    pageDataAttr: "commercial",
    bridgeKey: "afterPay",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "commercial_payment",
  },

  /**
   * Financial summary (closing + banking) — always shown as the final page.
   */
  financial_summary: {
    pageDataAttr: "closing",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "banking_closing",
  },

  /**
   * Project gallery / survey workflow — only when CRM marks site survey complete.
   */
  project_gallery: {
    pageDataAttr: "survey",
    bridgeKey: "afterInstall",
    eligibility: surveyOnly,
    renderKey: "survey_workflow",
  },

  /**
   * Warranty block — always shown; rendered as part of BOM page in residential,
   * standalone in commercial.
   */
  warranty: {
    pageDataAttr: "environment",
    bridgeKey: "afterImpact",
    eligibility: ALWAYS_ELIGIBLE,
    renderKey: "environment",
  },

  /**
   * Wave 3 P7 — Brand comparison card.
   * Side-by-side comparison of panel + inverter brands with key specs.
   * Commercial preset only; optional block — off by default.
   * No bridge key — self-contained context block.
   */
  brand_comparison_card: {
    pageDataAttr: "brand-comparison",
    eligibility: commercialOnly,
    renderKey: "brand_comparison",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if `blockId` is eligible given the current context.
 * Blocks without a registry entry are always considered eligible
 * (safe default for future blocks).
 */
export function isBlockEligible(
  blockId: ProposalBlockId,
  ctx: BlockEligibilityContext
): boolean {
  const meta = WEB_RENDERER_REGISTRY[blockId];
  if (!meta) return true;
  return meta.eligibility(ctx);
}

/**
 * Journey bridge strings — same content as `journeyBridge()` in proposal-view.tsx
 * but accessible by key here so the WebRenderer can produce them without importing
 * from the view file.
 */
export function getJourneyBridgeText(key: string | undefined, lang: "en" | "hi"): string {
  if (!key) return "";
  const en: Record<string, string> = {
    afterCover: "We start with who we are — then we look at your bill, your savings, and your system.",
    afterTrust: "Your real electricity bills show where costs go up — and where solar helps.",
    afterBill: "From your bill pattern, here is how much you can save each year.",
    afterRequirement: "Here is the system we sized for your requirement — generation, coverage, and commercial snapshot.",
    afterSavings: "Along with savings, solar also cuts pollution and helps the planet.",
    afterImpact: "This is the system size and parts we recommend for your roof.",
    afterSystem: "Here is how we install, support, and stay with you after go-live.",
    afterInstall: "Clear yearly care so your panels keep working for decades.",
    afterSupport: "Payment steps, subsidy, and commercial terms — all in one place.",
    afterPay: "Bank details and a simple way to say yes — we are ready when you are.",
    afterExecutive: "Here is the technical system we have sized for your facility.",
    afterPayback: "Along with financial returns, solar also delivers environmental impact.",
  };
  const hi: Record<string, string> = {
    afterCover: "पहले हमारा परिचय — फिर आपका बिल, बचत और सिस्टम।",
    afterTrust: "आपके असली बिल बताते हैं कि खर्च कहाँ बढ़ता है — और सोलर कहाँ मदद करता है।",
    afterBill: "बिल के हिसाब से, हर साल आप कितना बचा सकते हैं — यहाँ है।",
    afterRequirement: "आपकी ज़रूरत के हिसाब से सिस्टम — उत्पादन, कवरेज और वाणिज्यिक सारांश।",
    afterSavings: "बचत के साथ, सोलर से प्रदूषण भी कम होता है।",
    afterImpact: "आपकी छत के लिए सिस्टम साइज़ और सामान — यहाँ है।",
    afterSystem: "इंस्टॉल, सपोर्ट और बाद की देखभाल — कैसे करते हैं।",
    afterInstall: "सालाना AMC — ताकि पैनल सालों तक चलें।",
    afterSupport: "भुगतान, सब्सिडी और शर्तें — सब एक जगह।",
    afterPay: "बैंक विवरण और अगला कदम — जब आप तैयार हों।",
    afterExecutive: "आपकी सुविधा के लिए हमने जो सिस्टम तैयार किया है — यहाँ है।",
    afterPayback: "वित्तीय लाभ के साथ, सोलर पर्यावरण पर भी असर डालता है।",
  };
  return lang === "hi" ? hi[key] ?? en[key] ?? "" : en[key] ?? "";
}
