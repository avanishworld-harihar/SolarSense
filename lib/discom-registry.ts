import type { IndianStateOrUt } from "@/lib/indian-states-uts";

export type RegistryDiscom = {
  code: string;
  name: string;
  category?: "state_utility" | "private_licensee" | "department" | "municipal";
  source?: string;
};

export type DiscomRegistry = Record<IndianStateOrUt, RegistryDiscom[]>;

/**
 * Canonical DISCOM map for SOL.52 onboarding + audit workflows.
 * Sources (checked Apr 2026):
 * - DTL states/UT utilities list (updated Sep 2025)
 * - REC/CEA utility abbreviation references
 * - MPERC/MP DISCOM public portals for MP code normalization
 */
export const DISCOM_REGISTRY: DiscomRegistry = {
  "Andhra Pradesh": [
    { code: "APEPDCL", name: "AP Eastern Power Distribution Company Ltd.", source: "DTL/AP Power" },
    { code: "APCPDCL", name: "AP Central Power Distribution Company Ltd.", source: "APCPDCL" },
    { code: "APSPDCL", name: "AP Southern Power Distribution Company Ltd.", source: "DTL/APSPDCL" }
  ],
  "Arunachal Pradesh": [
    { code: "DOP-AR", name: "Department of Power, Arunachal Pradesh", category: "department", source: "DTL" }
  ],
  Assam: [{ code: "APDCL", name: "Assam Power Distribution Company Ltd.", source: "DTL" }],
  Bihar: [
    { code: "NBPDCL", name: "North Bihar Power Distribution Company Ltd.", source: "DTL" },
    { code: "SBPDCL", name: "South Bihar Power Distribution Company Ltd.", source: "DTL" }
  ],
  Chhattisgarh: [{ code: "CSPDCL", name: "Chhattisgarh State Power Distribution Company Ltd.", source: "DTL" }],
  Goa: [{ code: "GED", name: "Goa Electricity Department", category: "department", source: "DTL" }],
  Gujarat: [
    { code: "UGVCL", name: "Uttar Gujarat Vij Company Ltd.", source: "DTL" },
    { code: "DGVCL", name: "Dakshin Gujarat Vij Company Ltd.", source: "DTL" },
    { code: "MGVCL", name: "Madhya Gujarat Vij Company Ltd.", source: "DTL" },
    { code: "PGVCL", name: "Paschim Gujarat Vij Company Ltd.", source: "DTL" },
    { code: "TORRENT", name: "Torrent Power Ltd.", category: "private_licensee", source: "DTL" }
  ],
  Haryana: [
    { code: "UHBVNL", name: "Uttar Haryana Bijli Vitran Nigam Ltd.", source: "DTL" },
    { code: "DHBVNL", name: "Dakshin Haryana Bijli Vitran Nigam Ltd.", source: "DTL" }
  ],
  "Himachal Pradesh": [{ code: "HPSEBL", name: "HP State Electricity Board Ltd.", source: "DTL" }],
  Jharkhand: [
    { code: "JBVNL", name: "Jharkhand Bijli Vitran Nigam Ltd.", source: "DTL/Jharkhand utilities" },
    { code: "JUSCO", name: "Jamshedpur Utilities & Services Company Ltd.", category: "private_licensee", source: "DTL" },
    { code: "BPSCL", name: "Bokaro Power Supply Company Pvt. Ltd.", category: "private_licensee", source: "DTL" }
  ],
  Karnataka: [
    { code: "BESCOM", name: "Bangalore Electricity Supply Company Ltd.", source: "DTL" },
    { code: "CHESCOM", name: "Chamundeshwari Electricity Supply Corporation Ltd.", source: "DTL" },
    { code: "MESCOM", name: "Mangalore Electricity Supply Company Ltd.", source: "DTL" },
    { code: "HESCOM", name: "Hubli Electricity Supply Company Ltd.", source: "DTL" },
    { code: "GESCOM", name: "Gulbarga Electricity Supply Company Ltd.", source: "DTL" }
  ],
  Kerala: [{ code: "KSEBL", name: "Kerala State Electricity Board Ltd.", source: "DTL" }],
  "Madhya Pradesh": [
    { code: "MPPKVVCL", name: "MP Poorv Kshetra Vidyut Vitaran Co. Ltd.", source: "DTL/MPERC" },
    { code: "MPPGVVCL", name: "MP Paschim Kshetra Vidyut Vitaran Co. Ltd.", source: "DTL/MPERC" },
    { code: "MPMKVVCL", name: "MP Madhya Kshetra Vidyut Vitaran Co. Ltd.", source: "DTL/MPERC" }
  ],
  Maharashtra: [
    { code: "MSEDCL", name: "Maharashtra State Electricity Distribution Co. Ltd.", source: "DTL" },
    { code: "BEST", name: "BEST Undertaking", category: "municipal", source: "DTL" },
    { code: "TPC-D", name: "Tata Power Distribution", category: "private_licensee", source: "DTL" },
    { code: "AEML-D", name: "Adani Electricity Mumbai Ltd.", category: "private_licensee", source: "MERC licensee list" }
  ],
  Manipur: [{ code: "MSPDCL", name: "Manipur State Power Distribution Company Ltd.", source: "DTL" }],
  Meghalaya: [{ code: "MEPDCL", name: "Meghalaya Power Distribution Corporation Ltd.", source: "DTL" }],
  Mizoram: [{ code: "PED-MIZ", name: "Power & Electricity Department, Mizoram", category: "department", source: "DTL" }],
  Nagaland: [{ code: "DOP-NL", name: "Department of Power, Nagaland", category: "department", source: "DTL" }],
  Odisha: [
    { code: "TPCODL", name: "TP Central Odisha Distribution Ltd.", source: "Odisha DISCOM updates" },
    { code: "TPNODL", name: "TP Northern Odisha Distribution Ltd.", source: "Odisha DISCOM updates" },
    { code: "TPSODL", name: "TP Southern Odisha Distribution Ltd.", source: "Odisha DISCOM updates" },
    { code: "TPWODL", name: "TP Western Odisha Distribution Ltd.", source: "Odisha DISCOM updates" }
  ],
  Punjab: [{ code: "PSPCL", name: "Punjab State Power Corporation Ltd.", source: "DTL" }],
  Rajasthan: [
    { code: "AVVNL", name: "Ajmer Vidyut Vitran Nigam Ltd.", source: "DTL" },
    { code: "JVVNL", name: "Jaipur Vidyut Vitran Nigam Ltd.", source: "DTL" },
    { code: "JDVVNL", name: "Jodhpur Vidyut Vitran Nigam Ltd.", source: "DTL" }
  ],
  Sikkim: [{ code: "SKM-ED", name: "Energy & Power Department, Sikkim", category: "department", source: "DTL" }],
  "Tamil Nadu": [{ code: "TANGEDCO", name: "Tamil Nadu Generation and Distribution Corporation Ltd.", source: "DTL" }],
  Telangana: [
    { code: "TSNPDCL", name: "Telangana Northern Power Distribution Company Ltd.", source: "DTL" },
    { code: "TSSPDCL", name: "Telangana Southern Power Distribution Company Ltd.", source: "DTL" }
  ],
  Tripura: [{ code: "TSECL", name: "Tripura State Electricity Corporation Ltd.", source: "DTL" }],
  "Uttar Pradesh": [
    { code: "DVVNL", name: "Dakshinanchal Vidyut Vitaran Nigam Ltd.", source: "DTL" },
    { code: "MVVNL", name: "Madhyanchal Vidyut Vitaran Nigam Ltd.", source: "DTL" },
    { code: "PVVNL", name: "Pashchimanchal Vidyut Vitaran Nigam Ltd.", source: "DTL" },
    { code: "PUVVNL", name: "Poorvanchal Vidyut Vitaran Nigam Ltd.", source: "DTL" },
    { code: "KESCO", name: "Kanpur Electricity Supply Company", source: "DTL" },
    { code: "NPCL", name: "Noida Power Company Ltd.", category: "private_licensee", source: "DTL" }
  ],
  Uttarakhand: [{ code: "UPCL", name: "Uttarakhand Power Corporation Ltd.", source: "DTL" }],
  "West Bengal": [
    { code: "WBSEDCL", name: "West Bengal State Electricity Distribution Company Ltd.", source: "DTL" },
    { code: "CESC", name: "CESC Ltd.", category: "private_licensee", source: "DTL" },
    { code: "IPCL", name: "India Power Corporation Ltd.", category: "private_licensee", source: "WB licensee list" }
  ],
  "Andaman and Nicobar Islands": [
    {
      code: "AN-ED",
      name: "Electricity Department, Andaman and Nicobar Administration",
      category: "department",
      source: "DTL"
    }
  ],
  Chandigarh: [{ code: "CED", name: "Chandigarh Electricity Department", category: "department", source: "DTL" }],
  "Dadra and Nagar Haveli and Daman and Diu": [
    { code: "DNHDDPDCL", name: "DNH & DD Power Distribution Corporation Ltd.", source: "JERC/UT list" }
  ],
  Delhi: [
    { code: "BRPL", name: "BSES Rajdhani Power Ltd.", category: "private_licensee", source: "DTL" },
    { code: "BYPL", name: "BSES Yamuna Power Ltd.", category: "private_licensee", source: "DTL" },
    { code: "TPDDL", name: "Tata Power Delhi Distribution Ltd.", category: "private_licensee", source: "DTL" },
    { code: "NDMC", name: "New Delhi Municipal Council", category: "municipal", source: "DTL" },
    { code: "MES-DELHI", name: "Military Engineer Services (Delhi Cantonment)", category: "department", source: "DTL" }
  ],
  "Jammu and Kashmir": [
    { code: "JPDCL", name: "Jammu Power Distribution Corporation Ltd.", source: "J&K power utilities" },
    { code: "KPDCL", name: "Kashmir Power Distribution Corporation Ltd.", source: "J&K power utilities" }
  ],
  Ladakh: [{ code: "LPDD", name: "Ladakh Power Development Department", category: "department", source: "UT utility" }],
  Lakshadweep: [{ code: "LAK-ED", name: "Lakshadweep Electricity Department", category: "department", source: "DTL" }],
  Puducherry: [{ code: "PED-PY", name: "Electricity Department, Puducherry", category: "department", source: "DTL" }]
};

const CURRENT_UT_CANONICAL = "Dadra and Nagar Haveli and Daman and Diu";
const CURRENT_UT_ALIASES = new Set([
  "dadra and nagar haveli",
  "daman and diu",
  "dadra nagar haveli daman diu",
  "dnhdd",
  "dnh & dd"
]);
const STATE_ALIASES = new Map<string, IndianStateOrUt>([
  ["mp", "Madhya Pradesh"],
  ["m.p.", "Madhya Pradesh"],
  ["madhya pradesh", "Madhya Pradesh"],
  ["madhya-pradesh", "Madhya Pradesh"]
]);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveCanonicalState(input: string): IndianStateOrUt | null {
  const n = normalize(input);
  if (!n) return null;
  const aliasHit = STATE_ALIASES.get(n);
  if (aliasHit) return aliasHit;
  for (const key of Object.keys(DISCOM_REGISTRY) as IndianStateOrUt[]) {
    if (normalize(key) === n) return key;
  }
  if (CURRENT_UT_ALIASES.has(n)) return CURRENT_UT_CANONICAL;
  return null;
}

export function listRegistryDiscomsForState(inputState: string): RegistryDiscom[] {
  const canonical = resolveCanonicalState(inputState);
  if (!canonical) return [];
  return DISCOM_REGISTRY[canonical] ?? [];
}

