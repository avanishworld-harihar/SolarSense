export type ProposalThemePreset = "greenBlueClassic" | "greenBlueVivid";

export type ProposalBrandingSettings = {
  installerName: string;
  /** Phone / WhatsApp line (shown first on proposals). */
  installerContact: string;
  /** Email — combined with phone on web proposal & PPT as `phone · email`. */
  installerEmail: string;
  installerLogoUrl: string;
  personalizedBranding: boolean;
  themePreset: ProposalThemePreset;
  /** Payment QR code image URL (Supabase Storage). Shown on the Banking slide. */
  paymentQrCodeUrl: string;
};

const STORAGE_KEY = "ss_proposal_branding_settings_v1";

/** Dispatched on `window` after `writeProposalBrandingSettings` updates localStorage. */
export const PROPOSAL_BRANDING_UPDATED_EVENT = "ss-proposal-branding-updated";

export const DEFAULT_INSTALLER_PHONE = "+91-9993322267";
export const DEFAULT_INSTALLER_EMAIL = "harihar@solar.com";

/** Single line for `PremiumProposalPptInput.installerContact` / DB `installer_contact`. */
export function formatInstallerContactLine(phoneRaw: string, emailRaw: string): string {
  const phone = phoneRaw.trim();
  const email = emailRaw.trim();
  if (!phone && !email) return `${DEFAULT_INSTALLER_PHONE} · ${DEFAULT_INSTALLER_EMAIL}`;
  if (phone && email) return `${phone} · ${email}`;
  return phone || email;
}

export const DEFAULT_PROPOSAL_BRANDING_SETTINGS: ProposalBrandingSettings = {
  installerName: "Harihar Solar",
  installerContact: DEFAULT_INSTALLER_PHONE,
  installerEmail: DEFAULT_INSTALLER_EMAIL,
  installerLogoUrl: "",
  personalizedBranding: true,
  themePreset: "greenBlueClassic",
  paymentQrCodeUrl: ""
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
      installerEmail: typeof parsed.installerEmail === "string" ? parsed.installerEmail.trim() : "",
      installerLogoUrl: parsed.installerLogoUrl?.trim() || "",
      personalizedBranding:
        typeof parsed.personalizedBranding === "boolean"
          ? parsed.personalizedBranding
          : DEFAULT_PROPOSAL_BRANDING_SETTINGS.personalizedBranding,
      themePreset:
        parsed.themePreset === "greenBlueVivid" || parsed.themePreset === "greenBlueClassic"
          ? parsed.themePreset
          : DEFAULT_PROPOSAL_BRANDING_SETTINGS.themePreset,
      paymentQrCodeUrl: parsed.paymentQrCodeUrl?.trim() || ""
    };
  } catch {
    return { ...DEFAULT_PROPOSAL_BRANDING_SETTINGS };
  }
}

export function writeProposalBrandingSettings(next: ProposalBrandingSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PROPOSAL_BRANDING_UPDATED_EVENT));
  } catch {
    /* ignore storage errors */
  }
}
