/**
 * Reusable commercial pricing presets — local cache + optional org DB sync.
 */

import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import type { PricingLineItem } from "@/lib/proposal-pricing-lines";

export type CommercialPricingTemplate = {
  id: string;
  name: string;
  presetId: string;
  systemKw: number;
  lineItems: PricingLineItem[];
  commercialConfig: CommercialProposalConfig;
  updatedAt: string;
  organizationId?: string | null;
};

const LOCAL_KEY = "ss_commercial_pricing_templates_v1";
const LAST_USED_KEY = "ss_commercial_pricing_last_template_id";

export function readLocalPricingTemplates(): CommercialPricingTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommercialPricingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalPricingTemplates(templates: CommercialPricingTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(templates.slice(0, 24)));
  } catch {
    /* quota */
  }
}

export function rememberLastTemplateId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_USED_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readLastTemplateId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export function upsertLocalTemplate(
  input: Omit<CommercialPricingTemplate, "id" | "updatedAt"> & { id?: string }
): CommercialPricingTemplate {
  const list = readLocalPricingTemplates();
  const now = new Date().toISOString();
  const row: CommercialPricingTemplate = {
    id: input.id ?? `tpl-${Date.now().toString(36)}`,
    name: input.name.trim() || "Untitled pricing",
    presetId: input.presetId,
    systemKw: input.systemKw,
    lineItems: input.lineItems,
    commercialConfig: input.commercialConfig,
    updatedAt: now,
    organizationId: input.organizationId ?? null,
  };
  const idx = list.findIndex((t) => t.id === row.id);
  const next = [...list];
  if (idx >= 0) next[idx] = row;
  else next.unshift(row);
  writeLocalPricingTemplates(next);
  rememberLastTemplateId(row.id);
  return row;
}

export function deleteLocalTemplate(id: string): void {
  writeLocalPricingTemplates(readLocalPricingTemplates().filter((t) => t.id !== id));
}
