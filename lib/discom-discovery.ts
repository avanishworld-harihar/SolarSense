import type { ParsedBillShape } from "@/lib/bill-parse";
import { listRegistryDiscomsForState, resolveCanonicalState } from "@/lib/discom-registry";
import { saveRateChangeReport } from "@/lib/rate-change-reports";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export type DiscoverySignal = {
  shouldQueue: boolean;
  stateInput: string;
  discomInput: string;
  reason: "unknown_state" | "unknown_discom_for_state" | "missing_state_or_discom" | "known";
  canonicalState?: string;
};

export function evaluateDiscoverySignal(parsed: ParsedBillShape): DiscoverySignal {
  const stateInput = (parsed.state ?? "").trim();
  const discomInput = (parsed.discom ?? "").trim();
  if (!stateInput || !discomInput) {
    return { shouldQueue: false, stateInput, discomInput, reason: "missing_state_or_discom" };
  }

  const canonicalState = resolveCanonicalState(stateInput);
  if (!canonicalState) {
    return { shouldQueue: true, stateInput, discomInput, reason: "unknown_state" };
  }

  const registry = listRegistryDiscomsForState(canonicalState);
  if (!registry.length) {
    return {
      shouldQueue: true,
      stateInput,
      discomInput,
      reason: "unknown_discom_for_state",
      canonicalState
    };
  }

  const q = norm(discomInput);
  const hit = registry.some((d) => {
    const c = norm(d.code);
    const n = norm(d.name);
    return c === q || n === q || n.includes(q) || q.includes(c);
  });
  if (hit) {
    return { shouldQueue: false, stateInput, discomInput, reason: "known", canonicalState };
  }

  return {
    shouldQueue: true,
    stateInput,
    discomInput,
    reason: "unknown_discom_for_state",
    canonicalState
  };
}

export async function queueDiscoveryIfNeeded(parsed: ParsedBillShape): Promise<{
  queued: boolean;
  message?: string;
  reason?: DiscoverySignal["reason"];
}> {
  const signal = evaluateDiscoverySignal(parsed);
  if (!signal.shouldQueue) return { queued: false, reason: signal.reason };

  await saveRateChangeReport({
    installerName: "SOL.52 Discovery Bot",
    installerState: signal.stateInput || "Unknown State",
    activeTariff: signal.discomInput || "Unknown DISCOM",
    source: "discom_discovery",
    status: "pending_admin_approval",
    dedupeWindowHours: 168,
    note: `SOL.52 discovery queue: ${signal.reason}. Bill detected state='${signal.stateInput}', discom='${signal.discomInput}', canonical='${signal.canonicalState ?? "none"}'.`
  });

  return {
    queued: true,
    reason: signal.reason,
    message:
      "SOL.52 detected a new state/DISCOM pattern from this bill and queued it for admin verification + registry update."
  };
}

