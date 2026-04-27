/**
 * Sol.52 — lead source display metadata.
 *
 * Adding a new channel = add one entry here. Components derive everything
 * (label, colour, filter chip, row badge) from this map.
 */

export type LeadSourceKey =
  | "manual"
  | "website"
  | "whatsapp"
  | "meta_fb"
  | "meta_ig"
  | "api";

/** Normalise raw DB strings to a typed key. Unknown values map to 'manual'. */
export function normalizeSource(raw: string | null | undefined): LeadSourceKey {
  switch ((raw ?? "").toLowerCase().trim()) {
    case "website": return "website";
    case "whatsapp": return "whatsapp";
    case "meta_fb": return "meta_fb";
    case "meta_ig": return "meta_ig";
    case "api": return "api";
    default: return "manual";
  }
}

export type SourceMeta = {
  label: string;
  /** Short form for badges where full label doesn't fit. */
  shortLabel: string;
  /** Tailwind classes for the badge pill. */
  badgeClass: string;
  /** Tailwind classes for the filter chip (active state). */
  chipActiveClass: string;
};

export const SOURCE_META: Record<LeadSourceKey, SourceMeta> = {
  manual: {
    label: "Manual",
    shortLabel: "Manual",
    badgeClass:
      "border-slate-200/70 bg-slate-100/80 text-slate-600",
    chipActiveClass:
      "bg-slate-700 text-white border-slate-700"
  },
  website: {
    label: "Website",
    shortLabel: "Web",
    badgeClass:
      "border-sky-200/70 bg-sky-50/80 text-sky-700",
    chipActiveClass:
      "bg-sky-600 text-white border-sky-600"
  },
  whatsapp: {
    label: "WhatsApp",
    shortLabel: "WA",
    badgeClass:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
    chipActiveClass:
      "bg-emerald-600 text-white border-emerald-600"
  },
  meta_fb: {
    label: "Facebook Ads",
    shortLabel: "FB",
    badgeClass:
      "border-blue-200/70 bg-blue-50/80 text-blue-700",
    chipActiveClass:
      "bg-blue-600 text-white border-blue-600"
  },
  meta_ig: {
    label: "Instagram Ads",
    shortLabel: "IG",
    badgeClass:
      "border-pink-200/70 bg-pink-50/80 text-pink-700",
    chipActiveClass:
      "bg-pink-600 text-white border-pink-600"
  },
  api: {
    label: "API",
    shortLabel: "API",
    badgeClass:
      "border-violet-200/70 bg-violet-50/80 text-violet-700",
    chipActiveClass:
      "bg-violet-600 text-white border-violet-600"
  }
};

/** All source keys that should appear as filter chips in the customers list. */
export const SOURCE_FILTER_OPTIONS: { value: LeadSourceKey | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manual", label: "Manual" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meta_fb", label: "FB Ads" },
  { value: "meta_ig", label: "IG Ads" }
];

/** 14-day threshold (ms) for the "stale lead" amber pulse. */
export const STALE_LEAD_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Returns true when a lead should be considered stale — i.e. no touch in
 * >14 days. Uses `last_touched_at` when available; falls back to
 * `created_at` (the creation timestamp is the first touch).
 */
export function isLeadStale(lastTouchedAt: string | null | undefined): boolean {
  const ts = lastTouchedAt ? Date.parse(lastTouchedAt) : NaN;
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > STALE_LEAD_THRESHOLD_MS;
}
