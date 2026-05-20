"use client";

import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { useToast } from "@/components/ui/toast-center";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import {
  deleteLocalTemplate,
  readLocalPricingTemplates,
  upsertLocalTemplate,
  type CommercialPricingTemplate,
} from "@/lib/commercial-pricing-templates";
import type { PricingLineItem } from "@/lib/proposal-pricing-lines";
import { Bookmark, Save } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  presetId: string;
  systemKw: number;
  lineItems: PricingLineItem[];
  commercialConfig: CommercialProposalConfig;
  onApply: (tpl: CommercialPricingTemplate) => void;
};

export function CommercialPricingTemplatesPanel({
  presetId,
  systemKw,
  lineItems,
  commercialConfig,
  onApply,
}: Props) {
  const toast = useToast();
  const [templates, setTemplates] = useState<CommercialPricingTemplate[]>([]);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    setTemplates(readLocalPricingTemplates());
  }, []);

  function refresh() {
    setTemplates(readLocalPricingTemplates());
  }

  function saveTemplate() {
    const row = upsertLocalTemplate({
      name: saveName.trim() || `Commercial ${systemKw} kW`,
      presetId,
      systemKw,
      lineItems,
      commercialConfig,
    });
    refresh();
    setSaveName("");
    toast.push({ tone: "success", title: "Pricing saved", description: row.name });
  }

  return (
    <section className="rounded-xl border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-500/25 dark:bg-violet-950/15">
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-violet-600" />
        <p className="text-xs font-bold text-slate-900 dark:text-slate-50">Saved pricing templates</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Reuse BOM + panel config on the next deal</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <FloatingLabelInput
          label="Template name"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="h-10 min-w-[10rem] flex-1 rounded-lg text-sm"
        />
        <Button type="button" size="sm" className="h-10 gap-1 font-semibold" onClick={saveTemplate}>
          <Save className="h-3.5 w-3.5" />
          Save pricing
        </Button>
      </div>

      {templates.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {templates.slice(0, 6).map((tpl) => (
            <li
              key={tpl.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-[#0f1419]"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-50">{tpl.name}</p>
                <p className="text-[10px] text-slate-500">
                  {tpl.systemKw} kW · {new Date(tpl.updatedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => onApply(tpl)}>
                  Apply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11px] text-rose-600"
                  onClick={() => {
                    deleteLocalTemplate(tpl.id);
                    refresh();
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">No saved templates yet.</p>
      )}
    </section>
  );
}
