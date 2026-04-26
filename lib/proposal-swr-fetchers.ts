"use client";

import { DEFAULT_TARIFF_CONTEXT } from "@/lib/solar-engine";
import type { TariffContext } from "@/lib/tariff-types";
import type { DiscomOption } from "@/lib/supabase-discoms";

const TARIFF_CACHE_PREFIX = "ss_tariff_v1:";
const DISCOM_CACHE_PREFIX = "ss_discoms_v1:";

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

/** SWR fetcher: tariff context + last-good cache for offline / instant revisit. */
export async function swrTariffWithOfflineCache(url: string): Promise<{ data: TariffContext }> {
  const key = TARIFF_CACHE_PREFIX + url;
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { ok?: boolean; data?: TariffContext };
    if (j.ok && j.data) {
      writeLocal(key, JSON.stringify({ saved: Date.now(), data: j.data }));
      return { data: j.data };
    }
  } catch {
    /* network off */
  }
  const raw = readLocal(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { data?: TariffContext };
      if (parsed?.data) return { data: parsed.data };
    } catch {
      /* */
    }
  }
  return { data: DEFAULT_TARIFF_CONTEXT };
}

/** SWR fetcher: DISCOM dropdown list + cache when Supabase is slow or offline. */
export async function swrDiscomsWithOfflineCache(url: string): Promise<{ data: DiscomOption[] }> {
  const key = DISCOM_CACHE_PREFIX + url;
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { ok?: boolean; data?: DiscomOption[] };
    if (j.ok && Array.isArray(j.data)) {
      writeLocal(key, JSON.stringify({ saved: Date.now(), data: j.data }));
      return { data: j.data };
    }
  } catch {
    /* */
  }
  const raw = readLocal(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { data?: DiscomOption[] };
      if (parsed?.data) return { data: parsed.data };
    } catch {
      /* */
    }
  }
  return { data: [] };
}
