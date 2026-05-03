/**
 * Public web proposal: the dense "Site survey · shadow · workflow" page is
 * shown only after the installer marks the lead's site survey as complete in CRM.
 */
export function isLeadSurveyCompleteForProposal(raw: string | null | undefined): boolean {
  const v = (raw ?? "").toLowerCase().trim().replace(/_/g, "-");
  if (!v || v === "not-started" || v === "none" || v === "pending" || v === "scheduled") return false;
  return v === "complete" || v === "completed" || v === "done" || v === "filled";
}

/** Values stored on `leads.survey_status` (optional). */
export const LEAD_SURVEY_STATUS_OPTIONS = [
  { value: "", labelKey: "customers_surveyStatusUnset" },
  { value: "not_started", labelKey: "customers_surveyStatusNotStarted" },
  { value: "scheduled", labelKey: "customers_surveyStatusScheduled" },
  { value: "complete", labelKey: "customers_surveyStatusComplete" }
] as const;
