/** Pipeline values stored in DB `status` (and sent from forms). */
export const LEAD_STATUS_KEYS = [
  "new",
  "contacted",
  "site-survey-scheduled",
  "proposal-sent",
  "won"
] as const;

export type LeadStatusKey = (typeof LEAD_STATUS_KEYS)[number];

/** Keys in `lib/translations.ts` (`t()`). */
export const LEAD_STATUS_I18N_KEY: Record<LeadStatusKey, string> = {
  new: "leadStatus_new",
  contacted: "leadStatus_contacted",
  "site-survey-scheduled": "leadStatus_siteSurveyScheduled",
  "proposal-sent": "leadStatus_proposalSent",
  won: "leadStatus_won"
};

const LEGACY_MAP: Record<string, LeadStatusKey> = {
  lead: "new",
  new: "new",
  contacted: "contacted",
  "site-survey-scheduled": "site-survey-scheduled",
  "site_survey_scheduled": "site-survey-scheduled",
  "proposal-sent": "proposal-sent",
  proposalsent: "proposal-sent",
  won: "won"
};

export function normalizeLeadStatus(raw: string | null | undefined): LeadStatusKey {
  const key = (raw ?? "new").toLowerCase().trim().replace(/_/g, "-");
  if (LEGACY_MAP[key]) return LEGACY_MAP[key];
  if ((LEAD_STATUS_KEYS as readonly string[]).includes(key)) return key as LeadStatusKey;
  return "new";
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatusKey; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "site-survey-scheduled", label: "Site survey scheduled" },
  { value: "proposal-sent", label: "Proposal sent" },
  { value: "won", label: "Won" }
];

export const LEAD_STATUS_BADGE: Record<
  LeadStatusKey,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className:
      "border-sky-300/60 bg-gradient-to-br from-sky-100 to-sky-50 text-sky-900 shadow-sm shadow-sky-900/5"
  },
  contacted: {
    label: "Contacted",
    className:
      "border-violet-300/60 bg-gradient-to-br from-violet-100 to-violet-50 text-violet-900 shadow-sm shadow-violet-900/5"
  },
  "site-survey-scheduled": {
    label: "Site survey scheduled",
    className:
      "border-amber-300/60 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-950 shadow-sm shadow-amber-900/5"
  },
  "proposal-sent": {
    label: "Proposal sent",
    className:
      "border-brand-300/60 bg-gradient-to-br from-brand-100 to-brand-50 text-brand-900 shadow-sm shadow-brand-900/5"
  },
  won: {
    label: "Won",
    className:
      "border-emerald-300/60 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5"
  }
};
