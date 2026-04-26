export type PerformanceMode = "normal" | "smooth" | "max-battery";

export const PERFORMANCE_MODE_STORAGE_KEY = "ss_perf_mode";
export const DEFAULT_PERFORMANCE_MODE: PerformanceMode = "smooth";

export const PERFORMANCE_MODE_OPTIONS: Array<{ id: PerformanceMode; label: string; description: string }> = [
  { id: "normal", label: "Normal", description: "Full visual richness and premium motion." },
  { id: "smooth", label: "Smooth", description: "Balanced effects with better responsiveness." },
  { id: "max-battery", label: "Max Battery", description: "Minimum animation for highest speed." }
];

export function normalizePerformanceMode(raw: string | null | undefined): PerformanceMode {
  if (raw === "normal" || raw === "smooth" || raw === "max-battery") return raw;
  return DEFAULT_PERFORMANCE_MODE;
}

export function readPerformanceMode(): PerformanceMode {
  if (typeof window === "undefined") return DEFAULT_PERFORMANCE_MODE;
  try {
    return normalizePerformanceMode(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_PERFORMANCE_MODE;
  }
}

export function writePerformanceMode(mode: PerformanceMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore persistence failure */
  }
}

export function applyPerformanceMode(mode: PerformanceMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-ss-perf-mode", mode);
}
