/**
 * Readiness checks for requirement-based commercial proposals → Open Workspace.
 */

export function commercialRequirementHasSizing(
  requirementMonthlyKwh: string,
  overrideSolarKw: string,
  effectiveSolarKw: number
): boolean {
  if (parseFloat(requirementMonthlyKwh) > 0) return true;
  const ow = parseFloat(overrideSolarKw);
  if (Number.isFinite(ow) && ow > 0) return true;
  return effectiveSolarKw > 0;
}

export function getCommercialWorkspaceBlockReason(opts: {
  hasClient: boolean;
  hasSizing: boolean;
  isRequirementMode: boolean;
  hasBillOrUsage: boolean;
}): string | null {
  if (!opts.hasClient) {
    return "Add a contact name or organisation name to continue.";
  }
  if (opts.isRequirementMode) {
    if (!opts.hasSizing) {
      return "Enter monthly kWh or confirm system size (kW) from category / Step 3.";
    }
    return null;
  }
  if (!opts.hasBillOrUsage) {
    return "Upload at least one bill or enter monthly consumption.";
  }
  return null;
}
