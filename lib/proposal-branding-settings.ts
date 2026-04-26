export type ProposalThemePreset = "greenBlueClassic" | "greenBlueVivid";

export type ProposalBrandingSettings = {
  installerName: string;
  installerContact: string;
  installerLogoUrl: string;
  personalizedBranding: boolean;
  themePreset: ProposalThemePreset;
};

const STORAGE_KEY = "ss_proposal_branding_settings_v1";

export const DEFAULT_PROPOSAL_BRANDING_SETTINGS: ProposalBrandingSettings = {
  installerName: "Harihar Solar",
  installerContact: "+91-9993322267",
  installerLogoUrl: "",
  personalizedBranding: true,
  themePreset: "greenBlueClassic"
};

export function readProposalBrandingSettings(): ProposalBrandingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PROPOSAL_BRANDING_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROPOSAL_BRANDING_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ProposalBrandingSettings>;
    return {
      installerName: parsed.installerName?.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerName,
      installerContact: parsed.installerContact?.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.installerContact,
      installerLogoUrl: parsed.installerLogoUrl?.trim() || "",
      personalizedBranding:
        typeof parsed.personalizedBranding === "boolean"
          ? parsed.personalizedBranding
          : DEFAULT_PROPOSAL_BRANDING_SETTINGS.personalizedBranding,
      themePreset:
        parsed.themePreset === "greenBlueVivid" || parsed.themePreset === "greenBlueClassic"
          ? parsed.themePreset
          : DEFAULT_PROPOSAL_BRANDING_SETTINGS.themePreset
    };
  } catch {
    return { ...DEFAULT_PROPOSAL_BRANDING_SETTINGS };
  }
}

export function writeProposalBrandingSettings(next: ProposalBrandingSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ss-proposal-branding-updated"));
  } catch {
    /* ignore storage errors */
  }
}
