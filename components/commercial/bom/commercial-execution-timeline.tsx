"use client";

import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import {
  DEFAULT_EXECUTION_MILESTONES,
  newPanelBrandRowId,
  type ExecutionTimelineConfig,
} from "@/lib/commercial-solar-schema";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

type Props = {
  timeline: ExecutionTimelineConfig;
  onChange: (next: ExecutionTimelineConfig) => void;
};

export function CommercialExecutionTimeline({ timeline, onChange }: Props) {
  const milestones = timeline.milestones?.length ? timeline.milestones : DEFAULT_EXECUTION_MILESTONES;

  function move(id: string, dir: -1 | 1) {
    const idx = milestones.findIndex((m) => m.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= milestones.length) return;
    const next = [...milestones];
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    onChange({ ...timeline, milestones: next });
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-[#0f1419]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project execution timeline</p>
        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
          <input
            type="checkbox"
            checked={timeline.enabled !== false}
            onChange={(e) => onChange({ ...timeline, enabled: e.target.checked })}
          />
          Show in proposal
        </label>
      </div>
      <ul className="space-y-2">
        {milestones.map((m, idx) => (
          <li key={m.id} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-0.5 pt-1">
              <button type="button" disabled={idx === 0} onClick={() => move(m.id, -1)} className="text-slate-400 disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === milestones.length - 1}
                onClick={() => move(m.id, 1)}
                className="text-slate-400 disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <FloatingLabelInput
                label="Milestone"
                value={m.label}
                onChange={(e) =>
                  onChange({
                    ...timeline,
                    milestones: milestones.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)),
                  })
                }
                className="h-9 text-xs font-semibold"
              />
              <FloatingLabelInput
                label="Weeks"
                inputMode="numeric"
                value={m.durationWeeks != null ? String(m.durationWeeks) : ""}
                onChange={(e) =>
                  onChange({
                    ...timeline,
                    milestones: milestones.map((x) =>
                      x.id === m.id ? { ...x, durationWeeks: parseInt(e.target.value, 10) || 0 } : x
                    ),
                  })
                }
                className="h-9 text-xs font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({ ...timeline, milestones: milestones.filter((x) => x.id !== m.id) })
              }
              className="mt-2 text-slate-400 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-8 gap-1 text-xs"
        onClick={() =>
          onChange({
            ...timeline,
            milestones: [
              ...milestones,
              { id: newPanelBrandRowId(), label: "New milestone", durationWeeks: 2, enabled: true },
            ],
          })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add milestone
      </Button>
    </div>
  );
}
