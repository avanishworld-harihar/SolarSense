/**
 * SOL.52 Quick Actions — Wave 2 P5.
 *
 * Defines the canonical set of quick-launch actions available in:
 *   - The Cmd+K command palette
 *   - The dashboard command center
 *   - Future: bottom-sheet launchers on mobile
 *
 * Builder URL prefill contract:
 *   /proposal?preset=<PresetId>&orgType=<OrgType>&kw=<number>&lang=<lang>&story=<StoryMode>
 *
 *   All params are optional and additive. The builder reads them once on mount
 *   and discards the URL (does not persist in history). Existing session state
 *   is preserved if no URL params are present.
 *
 * Law 7 compliance: preset identity is the single driver for rendering decisions.
 * This file translates human-readable "start with hotel quote" intent into the
 * correct preset + story combination. It does NOT touch proposal engine internals.
 */

import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";
import type { OrgType } from "@/lib/org-type-defaults";
import type { StoryMode } from "@/lib/proposal-story-copy";

// ─── Builder URL param types ───────────────────────────────────────────────

export type BuilderPrefill = {
  /** Which preset to auto-select (skips preset picker) */
  preset?: ProposalPresetId;
  /** Commercial org type (pre-selects segment in future UI) */
  orgType?: OrgType;
  /** System size in kW to prefill */
  kw?: number;
  /** Language mode to pre-select (en | hi | bilingual) */
  lang?: "en" | "hi" | "bilingual";
  /** Story narrative mode to pre-select */
  story?: StoryMode;
  /** Panel catalog id e.g. waaree-540-dcr */
  panelCatalogId?: string;
};

/**
 * Serialises a BuilderPrefill into a `/proposal?...` URL string.
 * Only includes params that have defined values — no spurious `?preset=undefined`.
 */
export function buildProposalUrl(prefill: BuilderPrefill): string {
  const params = new URLSearchParams();
  if (prefill.preset) params.set("preset", prefill.preset);
  if (prefill.orgType) params.set("orgType", prefill.orgType);
  if (prefill.kw != null && Number.isFinite(prefill.kw)) params.set("kw", String(prefill.kw));
  if (prefill.lang) params.set("lang", prefill.lang);
  if (prefill.story) params.set("story", prefill.story);
  if (prefill.panelCatalogId) params.set("panel", prefill.panelCatalogId);
  const qs = params.toString();
  return qs ? `/proposal?${qs}` : "/proposal";
}

/**
 * Deserialises URLSearchParams into a BuilderPrefill.
 * Call on the client with `new URLSearchParams(window.location.search)`.
 * Unknown or malformed values are silently dropped.
 */
export function parsePrefillFromSearchParams(params: URLSearchParams): BuilderPrefill {
  const prefill: BuilderPrefill = {};

  const preset = params.get("preset");
  if (preset === "residential_smart" || preset === "commercial_executive") {
    prefill.preset = preset;
  }

  const orgType = params.get("orgType");
  const ORG_TYPES: OrgType[] = ["hotel", "hospital", "factory", "warehouse", "dairy", "school", "generic"];
  if (orgType && ORG_TYPES.includes(orgType as OrgType)) {
    prefill.orgType = orgType as OrgType;
  }

  const kw = params.get("kw");
  if (kw) {
    const n = parseFloat(kw);
    if (Number.isFinite(n) && n > 0 && n <= 10000) prefill.kw = n;
  }

  const lang = params.get("lang");
  if (lang === "en" || lang === "hi" || lang === "bilingual") {
    prefill.lang = lang;
  }

  const story = params.get("story");
  const STORY_MODES: StoryMode[] = ["executive_pitch", "cfo_brief", "operations_brief", "sustainability_story"];
  if (story && STORY_MODES.includes(story as StoryMode)) {
    prefill.story = story as StoryMode;
  }

  return prefill;
}

// ─── Quick action item type ────────────────────────────────────────────────

export type QuickActionCategory =
  | "Quick Actions"
  | "Commercial Segments"
  | "Navigation";

export type QuickAction = {
  id: string;
  label: string;
  description?: string;
  /** Resolved href — use buildProposalUrl() for builder deep-links */
  href: string;
  iconName:
    | "plus"
    | "building2"
    | "hotel"
    | "hospital"
    | "factory"
    | "warehouse"
    | "milk"
    | "school"
    | "layout-grid"
    | "users"
    | "folder-open"
    | "layout-dashboard"
    | "file-text"
    | "settings"
    | "zap";
  category: QuickActionCategory;
  /** Optional keyboard shortcut label (display only) */
  shortcut?: string;
};

// ─── Action definitions ────────────────────────────────────────────────────

export const QUICK_ACTIONS: QuickAction[] = [
  // ── Core quick actions ────────────────────────────────────────────────────
  {
    id: "new-residential",
    label: "New Residential Proposal",
    description: "Start a residential solar proposal (residential_smart preset)",
    href: buildProposalUrl({ preset: "residential_smart" }),
    iconName: "plus",
    category: "Quick Actions",
    shortcut: "N",
  },
  {
    id: "new-commercial",
    label: "New Commercial Proposal",
    description: "Start a commercial executive-deck proposal",
    href: buildProposalUrl({ preset: "commercial_executive" }),
    iconName: "building2",
    category: "Quick Actions",
  },
  {
    id: "new-quotation",
    label: "New Quick Quotation",
    description: "Lean BOM + price + terms quote — share via WhatsApp",
    href: "/quotation",
    iconName: "file-text",
    category: "Quick Actions",
  },
  {
    id: "proposals-hub",
    label: "Proposals Hub",
    description: "View all proposals, pipeline, and deal status",
    href: "/proposals",
    iconName: "layout-grid",
    category: "Quick Actions",
  },
  {
    id: "settings",
    label: "Settings & Branding",
    description: "Configure installer name, logo, and preferences",
    href: "/more",
    iconName: "settings",
    category: "Quick Actions",
  },

  // ── Commercial segment shortcuts ─────────────────────────────────────────
  {
    id: "commercial-hotel",
    label: "Hotel / Resort Quote",
    description: "Commercial executive deck — hospitality segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "hotel",
      story: "executive_pitch",
    }),
    iconName: "hotel",
    category: "Commercial Segments",
  },
  {
    id: "commercial-hospital",
    label: "Hospital / Clinic Quote",
    description: "Commercial executive deck — healthcare segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "hospital",
      story: "cfo_brief",
    }),
    iconName: "hospital",
    category: "Commercial Segments",
  },
  {
    id: "commercial-factory",
    label: "Factory / Manufacturing Quote",
    description: "Commercial executive deck — industrial segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "factory",
      story: "operations_brief",
    }),
    iconName: "factory",
    category: "Commercial Segments",
  },
  {
    id: "commercial-warehouse",
    label: "Warehouse / Logistics Quote",
    description: "Commercial executive deck — logistics segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "warehouse",
      story: "operations_brief",
    }),
    iconName: "warehouse",
    category: "Commercial Segments",
  },
  {
    id: "commercial-school",
    label: "School / Institution Quote",
    description: "Commercial executive deck — education segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "school",
      story: "sustainability_story",
    }),
    iconName: "school",
    category: "Commercial Segments",
  },
  {
    id: "commercial-dairy",
    label: "Dairy / Cold Storage Quote",
    description: "Commercial executive deck — dairy & agri segment",
    href: buildProposalUrl({
      preset: "commercial_executive",
      orgType: "dairy",
      story: "operations_brief",
    }),
    iconName: "milk",
    category: "Commercial Segments",
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Solar business overview and key metrics",
    href: "/",
    iconName: "layout-dashboard",
    category: "Navigation",
  },
  {
    id: "nav-customers",
    label: "Customers",
    description: "Manage leads and customer profiles",
    href: "/customers",
    iconName: "users",
    category: "Navigation",
  },
  {
    id: "nav-projects",
    label: "Projects",
    description: "Track solar installation projects",
    href: "/projects",
    iconName: "folder-open",
    category: "Navigation",
  },
  {
    id: "nav-proposals",
    label: "Proposals",
    description: "Proposal pipeline and documents",
    href: "/proposals",
    iconName: "file-text",
    category: "Navigation",
  },
];

export const QUICK_ACTION_CATEGORIES: QuickActionCategory[] = [
  "Quick Actions",
  "Commercial Segments",
  "Navigation",
];

/**
 * Fuzzy-filter quick actions by label and description.
 * Returns all actions when query is empty.
 */
export function filterQuickActions(query: string): QuickAction[] {
  if (!query.trim()) return QUICK_ACTIONS;
  const q = query.toLowerCase();
  return QUICK_ACTIONS.filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q)
  );
}
