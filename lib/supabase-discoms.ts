import { supabase } from "@/lib/supabase";
import { listRegistryDiscomsForState } from "@/lib/discom-registry";

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export type DiscomOption = {
  id: string;
  code: string;
  name: string;
};

/**
 * DISCOM dropdown: prefer `discoms` filtered by selected state (`state_id` → `states`).
 */
export async function listDiscomsForState(stateHint: string): Promise<DiscomOption[]> {
  const registryRows = listRegistryDiscomsForState(stateHint).map((r) => ({
    id: `registry_${r.code}`,
    code: r.code,
    name: r.name
  }));
  if (!supabase) return registryRows;

  const st = stateHint.trim().toLowerCase();
  let stateId: string | null = null;

  if (st) {
    const { data: stRows, error: stErr } = await supabase.from("states").select("*").limit(200);
    if (!stErr && stRows?.length) {
      const hit = (stRows as Record<string, unknown>[]).find((r) => {
        const n = pickStr(r, ["name", "state_name", "title"]).toLowerCase();
        const c = pickStr(r, ["code", "state_code"]).toLowerCase();
        return n.includes(st) || st.includes(n) || c === st || st.includes(c);
      });
      if (hit?.id != null) stateId = String(hit.id);
    }
  }

  const { data: drows, error: derr } = await supabase.from("discoms").select("*").limit(600);
  if (derr || !drows?.length) return registryRows;

  let rows = drows as Record<string, unknown>[];
  if (stateId) {
    const filtered = rows.filter((row) => String(row.state_id ?? row.stateId ?? "") === stateId);
    if (filtered.length) rows = filtered;
  }

  const out: DiscomOption[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id ?? row.discom_id;
    if (id == null) continue;
    const idStr = String(id);
    if (seen.has(idStr)) continue;
    const code = pickStr(row, ["code", "discom_code", "short_code"]) || idStr;
    const name = pickStr(row, ["name", "discom_name", "title"]) || code;
    seen.add(idStr);
    out.push({ id: idStr, code, name });
  }

  const merged = [...registryRows];
  const seenCodes = new Set(merged.map((r) => r.code.toLowerCase()));
  for (const row of out) {
    const k = row.code.toLowerCase();
    if (seenCodes.has(k)) continue;
    seenCodes.add(k);
    merged.push(row);
  }

  merged.sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
  return merged;
}
