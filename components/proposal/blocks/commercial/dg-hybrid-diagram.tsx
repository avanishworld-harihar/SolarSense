"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={cn("h-6 w-6 text-sky-400/80", className)} aria-hidden>
      <path d="M12 2v22M6 18l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DiagonalArrow({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={cn("h-5 w-12 text-amber-400/70", flip && "scale-x-[-1]")}
      aria-hidden
    >
      <path d="M4 28 L40 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M32 4 L40 4 L40 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type Props = {
  systemKw: number;
  capacityKva: number;
  presentation?: boolean;
  className?: string;
};

export function DgHybridDiagram({ systemKw, capacityKva, presentation = false, className }: Props) {
  const topNodes = [
    { label: "GRID", sub: "DISCOM supply", cls: "border-slate-400/50 bg-slate-500/15 text-slate-200" },
    { label: "LT PANEL", sub: "Main distribution", cls: "border-sky-400/50 bg-sky-500/15 text-sky-100" },
    { label: "HYBRID CONTROLLER", sub: "Priority · ATS", cls: "border-indigo-400/60 bg-indigo-500/20 text-indigo-100" },
  ] as const;

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-[#0c1220] to-slate-950 p-4 sm:p-6",
        presentation && "shadow-2xl ring-1 ring-white/10",
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" />
      <p className="relative mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/90">
        Single-line · Solar + DG hybrid
      </p>

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-1">
        {topNodes.map((node, i) => (
          <div key={node.label} className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "w-full min-w-[200px] rounded-xl border px-4 py-2.5 text-center shadow-lg backdrop-blur-sm",
                node.cls
              )}
            >
              <p className="text-xs font-bold tracking-wide">{node.label}</p>
              <p className="text-[10px] opacity-80">{node.sub}</p>
            </motion.div>
            {i < topNodes.length - 1 ? <Arrow /> : null}
          </div>
        ))}

        <div className="relative flex w-full max-w-sm items-start justify-between gap-2 pt-2">
          <div className="flex flex-col items-center">
            <DiagonalArrow />
            <div className="mt-1 rounded-xl border border-amber-400/60 bg-amber-500/20 px-3 py-2 text-center text-amber-100">
              <p className="text-[11px] font-bold">{systemKw} kW SOLAR</p>
              <p className="text-[9px] opacity-80">On-site PV</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <DiagonalArrow flip />
            <div className="mt-1 rounded-xl border border-rose-400/60 bg-rose-500/20 px-3 py-2 text-center text-rose-100">
              <p className="text-[11px] font-bold">{capacityKva} kVA DG</p>
              <p className="text-[9px] opacity-80">Critical backup</p>
            </div>
          </div>
        </div>

        <Arrow className="mt-2" />
        <div className="w-full min-w-[200px] rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2.5 text-center text-emerald-100">
          <p className="text-xs font-bold tracking-wide">CRITICAL LOADS</p>
          <p className="text-[10px] opacity-80">Operations · Life safety · IT</p>
        </div>
      </div>
    </motion.div>
  );
}
