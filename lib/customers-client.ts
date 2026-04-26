import type { CustomerLead } from "@/lib/types";

export const CUSTOMERS_SWR_KEY = "/api/customers";

const STORAGE_KEY = "ss_v1_customers_list";
const SAVED_AT_KEY = "ss_v1_customers_saved_at";

/** Call after a successful network mutation (e.g. POST lead) so offline age reflects reality. */
export function touchCustomersSavedAt() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function getCustomersCacheAgeMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_AT_KEY);
    if (!raw) return null;
    const saved = Number(raw);
    if (!Number.isFinite(saved)) return null;
    return Date.now() - saved;
  } catch {
    return null;
  }
}

export function readCustomersCache(): CustomerLead[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed as CustomerLead[];
  } catch {
    return undefined;
  }
}

export function writeCustomersCache(list: CustomerLead[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/**
 * Loads customers from the API when online; on failure or offline, returns the last list
 * from localStorage (including an empty list if that was the last known state).
 */
export async function fetchCustomers(path: string): Promise<CustomerLead[]> {
  const cached = readCustomersCache();

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (cached !== undefined) return cached;
    throw new Error("No saved customer list yet. Open Customers online once to cache leads.");
  }

  try {
    const response = await fetch(path, { method: "GET" });
    const payload = (await response.json()) as { ok?: boolean; data?: CustomerLead[] };
    if (!response.ok || !payload.ok || !Array.isArray(payload.data)) {
      throw new Error("Bad response");
    }
    writeCustomersCache(payload.data);
    touchCustomersSavedAt();
    return payload.data;
  } catch {
    if (cached !== undefined) return cached;
    throw new Error("No saved customer list yet. Open Customers online once to cache leads.");
  }
}
