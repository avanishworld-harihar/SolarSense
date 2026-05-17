export type ProposalThemePreset = "greenBlueClassic" | "greenBlueVivid";

/** Default AMC term shown on commercial / service slides when generating a proposal. */
export type ProposalAmcYears = 1 | 5 | 10;

export function parseProposalAmcYears(value: unknown): ProposalAmcYears {
  const n = Number(value);
  if (n === 5) return 5;
  if (n === 10) return 10;
  return 1;
}

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
  /** AMC plan term for generated proposals / PPT. */
  amcSelectedYears: ProposalAmcYears;
  /** Banking line items for proposal banking slide + UPI QR text. */
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  bankUpiId: string;
  /** Past installation photo URLs (max 6) for web proposal + deck. */
  proposalSiteImages: string[];
  /** GSTIN shown on proposal About / commercial slides (set in More → Company profile). */
  companyGstNumber: string;
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
  paymentQrCodeUrl: "",
  amcSelectedYears: 1,
  bankAccountName: "Harihar Solar",
  bankAccountNumber: "",
  bankIfsc: "",
  bankBranch: "",
  bankUpiId: "",
  proposalSiteImages: [],
  companyGstNumber: ""
};

function parseSiteImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 6);
}

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
      paymentQrCodeUrl: parsed.paymentQrCodeUrl?.trim() || "",
      amcSelectedYears: parseProposalAmcYears(parsed.amcSelectedYears),
      bankAccountName: parsed.bankAccountName?.trim() || DEFAULT_PROPOSAL_BRANDING_SETTINGS.bankAccountName,
      bankAccountNumber: typeof parsed.bankAccountNumber === "string" ? parsed.bankAccountNumber.trim() : "",
      bankIfsc: typeof parsed.bankIfsc === "string" ? parsed.bankIfsc.trim() : "",
      bankBranch: typeof parsed.bankBranch === "string" ? parsed.bankBranch.trim() : "",
      bankUpiId: typeof parsed.bankUpiId === "string" ? parsed.bankUpiId.trim() : "",
      proposalSiteImages: parseSiteImages(parsed.proposalSiteImages),
      companyGstNumber:
        typeof parsed.companyGstNumber === "string" ? parsed.companyGstNumber.trim().toUpperCase() : ""
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
