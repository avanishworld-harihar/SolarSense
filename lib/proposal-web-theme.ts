export type ProposalWebTheme = "dark" | "light";

const STORAGE_KEY = "ss_proposal_web_theme_v2";

/** Default for web proposals — light document; user opts into dark via toggle. */
export function defaultProposalWebTheme(): ProposalWebTheme {
  return "light";
}

export function readProposalWebTheme(): ProposalWebTheme {
  if (typeof window === "undefined") return defaultProposalWebTheme();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "dark") return "dark";
    if (raw === "light") return "light";
    return defaultProposalWebTheme();
  } catch {
    return defaultProposalWebTheme();
  }
}

export function writeProposalWebTheme(theme: ProposalWebTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyProposalRouteShellTheme(theme: ProposalWebTheme): void {
  if (typeof document === "undefined") return;
  const root = document.getElementById("proposal-route-root");
  if (!root) return;
  const dark = theme === "dark";
  root.style.backgroundColor = dark ? "#030712" : "#f8fafc";
  root.style.color = dark ? "#e2e8f0" : "#0f172a";
}
