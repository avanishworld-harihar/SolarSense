const KEY = "ss_v1_lead_followups";

type Map = Record<string, number>;

export function readLeadFollowUpMap(): Map {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    return p as Map;
  } catch {
    return {};
  }
}

function writeMap(m: Map) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* */
  }
}

export function recordLeadFollowUp(leadId: string) {
  const m = readLeadFollowUpMap();
  m[leadId] = Date.now();
  writeMap(m);
}

export function getLeadFollowUpTimestamp(leadId: string): number | null {
  const t = readLeadFollowUpMap()[leadId];
  return typeof t === "number" && Number.isFinite(t) ? t : null;
}
