/**
 * SOL.52 Organisation Type Defaults — Wave 2 P5.
 *
 * Canonical configuration for each commercial organisation segment.
 * Used by:
 *   - Quick-action URL builder (orgType URL param)
 *   - Commercial preset block titles (Wave 3 story mode wiring)
 *   - Customers page org-type selector (after migration 025 ships)
 *   - Proposal deck customisation (segment-specific copy)
 *
 * Law 7: preset identity drives rendering. This file provides the
 * segment-level metadata that lives one layer below the preset.
 * Segments always belong to the "commercial_executive" preset.
 *
 * Law 2: this file is additive. New org types are appended to ORG_TYPES.
 * Existing entries are never modified in a way that breaks stored data.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export const ORG_TYPE_IDS = [
  "hotel",
  "hospital",
  "factory",
  "warehouse",
  "dairy",
  "school",
  "generic",
] as const;

export type OrgType = (typeof ORG_TYPE_IDS)[number];

export type OrgTypeSpec = {
  /** Machine-readable key stored in DB (customers.organization_type, Wave 2 migration) */
  id: OrgType;
  /** Display label — English */
  labelEn: string;
  /** Display label — Hindi */
  labelHi: string;
  /** Short description for UI tooltips */
  descriptionEn: string;
  /** Typical system size range in kW (used to seed the kW input in the builder) */
  typicalKwMin: number;
  typicalKwMax: number;
  /** Default kW suggestion shown in the builder when this org type is selected */
  defaultKw: number;
  /** Primary solar benefit to highlight in story copy */
  primaryBenefit: "cost_reduction" | "carbon_reduction" | "reliability" | "compliance";
  /** Lucide icon name for visual identification */
  iconName: string;
  /** Preset that best matches this org type */
  defaultPreset: "commercial_executive";
};

// ─── Spec table ────────────────────────────────────────────────────────────

export const ORG_TYPES: Record<OrgType, OrgTypeSpec> = {
  hotel: {
    id: "hotel",
    labelEn: "Hotel / Resort",
    labelHi: "होटल / रिसॉर्ट",
    descriptionEn: "Hospitality properties with high HVAC and amenity loads",
    typicalKwMin: 30,
    typicalKwMax: 500,
    defaultKw: 100,
    primaryBenefit: "cost_reduction",
    iconName: "hotel",
    defaultPreset: "commercial_executive",
  },
  hospital: {
    id: "hospital",
    labelEn: "Hospital / Clinic",
    labelHi: "अस्पताल / क्लिनिक",
    descriptionEn: "Healthcare facilities with critical power reliability needs",
    typicalKwMin: 20,
    typicalKwMax: 300,
    defaultKw: 75,
    primaryBenefit: "reliability",
    iconName: "hospital",
    defaultPreset: "commercial_executive",
  },
  factory: {
    id: "factory",
    labelEn: "Factory / Manufacturing",
    labelHi: "कारखाना / मैन्युफैक्चरिंग",
    descriptionEn: "Industrial units with large motor and process loads",
    typicalKwMin: 50,
    typicalKwMax: 2000,
    defaultKw: 200,
    primaryBenefit: "cost_reduction",
    iconName: "factory",
    defaultPreset: "commercial_executive",
  },
  warehouse: {
    id: "warehouse",
    labelEn: "Warehouse / Logistics",
    labelHi: "वेयरहाउस / लॉजिस्टिक्स",
    descriptionEn: "Storage and distribution facilities with large roof areas",
    typicalKwMin: 50,
    typicalKwMax: 1000,
    defaultKw: 150,
    primaryBenefit: "cost_reduction",
    iconName: "warehouse",
    defaultPreset: "commercial_executive",
  },
  dairy: {
    id: "dairy",
    labelEn: "Dairy / Cold Storage",
    labelHi: "डेयरी / कोल्ड स्टोरेज",
    descriptionEn: "Agri-processing units with refrigeration and pumping loads",
    typicalKwMin: 20,
    typicalKwMax: 300,
    defaultKw: 80,
    primaryBenefit: "cost_reduction",
    iconName: "milk",
    defaultPreset: "commercial_executive",
  },
  school: {
    id: "school",
    labelEn: "School / Institution",
    labelHi: "स्कूल / संस्था",
    descriptionEn: "Educational institutions prioritising sustainability and CSR",
    typicalKwMin: 15,
    typicalKwMax: 200,
    defaultKw: 50,
    primaryBenefit: "carbon_reduction",
    iconName: "school",
    defaultPreset: "commercial_executive",
  },
  generic: {
    id: "generic",
    labelEn: "Commercial (Other)",
    labelHi: "कमर्शियल (अन्य)",
    descriptionEn: "Any commercial establishment not listed above",
    typicalKwMin: 10,
    typicalKwMax: 1000,
    defaultKw: 50,
    primaryBenefit: "cost_reduction",
    iconName: "building2",
    defaultPreset: "commercial_executive",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns the OrgTypeSpec for a given id; falls back to `generic`. */
export function getOrgType(id: OrgType | string | null | undefined): OrgTypeSpec {
  if (id && id in ORG_TYPES) return ORG_TYPES[id as OrgType];
  return ORG_TYPES.generic;
}

/** Returns all org types as an array for rendering selects/pickers. */
export function listOrgTypes(): OrgTypeSpec[] {
  return ORG_TYPE_IDS.map((id) => ORG_TYPES[id]);
}

/** Returns the default kW suggestion for an org type, or 50 as a safe fallback. */
export function defaultKwForOrgType(id: OrgType | string | null | undefined): number {
  return getOrgType(id).defaultKw;
}
