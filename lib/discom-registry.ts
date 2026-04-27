// 1. Database and Registry state
let isRegistryDisabled = false;
let disabledUntil = 0;

// 2. Exported functions jo doosri files ko chahiye
export function canQueryDiscomFormats(): boolean {
  if (!isRegistryDisabled) return true;
  if (Date.now() > disabledUntil) {
    isRegistryDisabled = false;
    return true;
  }
  return false;
}

export function disableDiscomFormatsTemporarily() {
  isRegistryDisabled = true;
  // 1 ghante ke liye disable (temporary fix)
  disabledUntil = Date.now() + 1000 * 60 * 60; 
}

export function isMissingDiscomFormatsTable(message: string): boolean {
  return (
    message.includes("relation") && 
    message.includes("does not exist") && 
    message.includes("discom_formats")
  );
}

// 3. Baaki functions (agar file mein aur kuch tha toh wo yahan niche rehne dein)
type RegistryDiscom = { code: string; name: string };
type StateRegistry = { aliases: string[]; discoms: RegistryDiscom[] };

const REGISTRY: StateRegistry[] = [
  {
    aliases: ["madhya pradesh", "mp"],
    discoms: [
      { code: "MPMKVVCL", name: "MP Madhya Kshetra (Central · Bhopal)" },
      { code: "MPPaKVVCL", name: "MP Paschim Kshetra (West · Indore)" },
      { code: "MPPKVVCL",  name: "MP Poorv Kshetra (East · Jabalpur)" }
    ]
  }
];

export function listRegistryDiscomsForState(stateCode: string): RegistryDiscom[] {
  const norm = stateCode.trim().toLowerCase();
  if (!norm) return [];
  const entry = REGISTRY.find((r) => r.aliases.some((a) => norm.includes(a) || a.includes(norm)));
  return entry?.discoms ?? [];
}
/**
 * State names ko standard format mein badalne ke liye
 */
export function resolveCanonicalState(stateName: string | undefined): string {
  if (!stateName) return "Unknown";
  const normalized = stateName.trim().toLowerCase();
  
  // Basic mapping (aap ise apne indian-states-uts.ts ke hisaab se badal sakte hain)
  if (normalized.includes("madhya") || normalized === "mp") return "MP";
  if (normalized.includes("maharashtra") || normalized === "mh") return "MH";
  if (normalized.includes("delhi")) return "DL";
  
  return stateName; // Default wahi return karein
}