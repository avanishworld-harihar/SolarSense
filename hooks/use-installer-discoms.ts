"use client";

import { installerDiscomsUrl } from "@/lib/installer-region-storage";
import { swrDiscomsWithOfflineCache } from "@/lib/proposal-swr-fetchers";
import type { DiscomOption } from "@/lib/supabase-discoms";
import useSWR from "swr";

export function useInstallerDiscoms(state: string) {
  const key = state.trim() ? installerDiscomsUrl(state.trim()) : null;
  const { data, error, isLoading } = useSWR(key, swrDiscomsWithOfflineCache, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false
  });
  const options: DiscomOption[] = data?.data ?? [];
  return { options, error, loading: Boolean(key) && isLoading && options.length === 0 };
}
