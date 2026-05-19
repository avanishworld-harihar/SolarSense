"use client";

/**
 * Hotel Energy Story — executive infographic proposal sections.
 * Phases A–G as defined in the product brief:
 *   A  Hotel Energy Profile   — load category breakdown
 *   B  DG + Solar Hybrid      — animated energy flow infographic
 *   C  Diesel Savings         — before/after comparison
 *   D  Guest Experience       — ESG / brand benefits
 *   E  Energy Ecosystem Map   — visual node connections
 *   F  Executive Dashboard    — KPI summary
 *
 * Design axiom: Tesla investor deck meets Apple enterprise slide.
 * No clutter · No CAD · Cinematic · Mobile-first.
 */

import { useRef, useEffect } from "react";
import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import {
  BedDouble, Wind, ChefHat, Shirt, ArrowUpDown, Music2, Lightbulb, Zap,
  TrendingDown, Leaf, Star, Shield, Globe, Award, BarChart3,
  Sun, Battery, Cpu, ChevronDown, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HotelStoryProps = {
  systemKw: number;
  annualSavingsInr: number;
  netCostInr: number;
  paybackYears: number;
  annualGenerationKwh?: number;
  carbonKgPerYear?: number;
};

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (inView) void animate(mv, value, { duration: 1.4, ease: "easeOut" });
  }, [inView, value, mv]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
      }
    });
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const glass =
  "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm";
const glassDark =
  "rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md";
const sectionBase =
  "relative overflow-hidden rounded-3xl px-5 py-8 sm:px-8 sm:py-10";

function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
      {children}
    </h2>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE A — Hotel Energy Profile
// ═══════════════════════════════════════════════════════════════════════════════

const HOTEL_LOADS = [
  { icon: Wind,    label: "HVAC",         share: 38, kw: "high",   color: "sky" },
  { icon: BedDouble, label: "Rooms",       share: 18, kw: "medium", color: "indigo" },
  { icon: ChefHat, label: "Kitchen",       share: 14, kw: "high",   color: "amber" },
  { icon: Music2,  label: "Banquet",       share: 12, kw: "medium", color: "violet" },
  { icon: Shirt,   label: "Laundry",       share: 8,  kw: "medium", color: "teal" },
  { icon: ArrowUpDown, label: "Lifts",     share: 5,  kw: "low",    color: "emerald" },
  { icon: Lightbulb, label: "Common Area", share: 4,  kw: "low",    color: "yellow" },
  { icon: Zap,     label: "DG Backup",     share: 1,  kw: "reserve",color: "rose" },
];

const COLOR_STYLE: Record<string, string> = {
  sky:     "from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-300",
  indigo:  "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300",
  amber:   "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300",
  violet:  "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-300",
  teal:    "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-300",
  emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300",
  yellow:  "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300",
  rose:    "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300",
};

function PhaseA({ systemKw }: { systemKw: number }) {
  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-slate-950 via-[#0c1525] to-slate-900")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-900/30 via-transparent to-transparent" />
      <div className="relative">
        <SectionLabel>Phase A · Hotel Load Analysis</SectionLabel>
        <SectionTitle>Where Your Energy Goes</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          A {systemKw} kW solar system is sized to offset your highest-consumption departments first.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {HOTEL_LOADS.map((load, i) => {
            const Icon = load.icon;
            const cs = COLOR_STYLE[load.color];
            return (
              <motion.div
                key={load.label}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border bg-gradient-to-br p-3.5",
                  cs
                )}
              >
                <Icon className="h-5 w-5" />
                <p className="text-[13px] font-bold text-white">{load.label}</p>
                <div className="flex items-center justify-between">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${load.share}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 + 0.2, duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full bg-current"
                    />
                  </div>
                  <span className="ml-2 text-[11px] font-bold">{load.share}%</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Typical hotel energy profile. Solar offsets HVAC + Kitchen + Rooms = 70%+ of grid draw.
        </p>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE B — DG + Solar Hybrid Infographic
// ═══════════════════════════════════════════════════════════════════════════════

const FLOW_NODES = [
  { id: "grid",   label: "Grid Supply",    sub: "DISCOM",          icon: Zap,     color: "#64748b" },
  { id: "solar",  label: "Solar Plant",    sub: `On-rooftop kW`,   icon: Sun,     color: "#f59e0b" },
  { id: "panel",  label: "Smart LT Panel", sub: "Auto switching",  icon: Cpu,     color: "#3b82f6" },
  { id: "load",   label: "Hotel Loads",    sub: "HVAC · Rooms · Kitchen", icon: BedDouble, color: "#10b981" },
  { id: "dg",     label: "DG Backup",      sub: "Emergency only",  icon: Battery, color: "#ef4444" },
];

function FlowArrow({ animated }: { animated?: boolean }) {
  return (
    <div className="flex justify-center py-1">
      <motion.div
        animate={animated ? { y: [0, 4, 0] } : {}}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        className="flex flex-col items-center"
      >
        <div className="h-6 w-0.5 bg-gradient-to-b from-sky-400 to-sky-600" />
        <ChevronDown className="h-3 w-3 text-sky-500" />
      </motion.div>
    </div>
  );
}

function PhaseB({ systemKw }: { systemKw: number }) {
  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-[#080d1a] via-slate-950 to-[#0c1525]")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
      <div className="relative">
        <SectionLabel>Phase B · System Architecture</SectionLabel>
        <SectionTitle>Smart Energy Routing</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Solar gets priority. DG activates only when solar + grid cannot meet demand.
        </p>

        <div className="mt-8 flex flex-col items-center gap-0">
          {FLOW_NODES.map((node, i) => {
            const Icon = node.icon;
            const isLast = i === FLOW_NODES.length - 1;
            return (
              <div key={node.id} className="flex w-full max-w-xs flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                  className="w-full"
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: node.color + "40",
                      background: `linear-gradient(135deg, ${node.color}15, ${node.color}08)`,
                    }}
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: node.color + "25", color: node.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-white">
                        {node.id === "solar" ? `${systemKw} kW ${node.label}` : node.label}
                      </p>
                      <p className="text-[10px] text-slate-500">{node.sub}</p>
                    </div>
                    {node.id === "solar" && (
                      <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400"
                      >
                        PRIORITY
                      </motion.div>
                    )}
                    {node.id === "dg" && (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                        STANDBY
                      </span>
                    )}
                  </div>
                </motion.div>
                {!isLast && <FlowArrow animated={i === 1} />}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { label: "Daytime Priority", desc: "Solar covers 90%+ of day load", color: "amber" },
            { label: "DG Runtime Cut", desc: "60–80% reduction in DG hours", color: "emerald" },
            { label: "Auto Switch", desc: "Seamless grid ↔ solar transition", color: "sky" },
          ].map((fact) => (
            <div
              key={fact.label}
              className={cn(
                "rounded-xl border p-2.5 text-center",
                fact.color === "amber" ? "border-amber-500/25 bg-amber-500/8" :
                fact.color === "emerald" ? "border-emerald-500/25 bg-emerald-500/8" :
                "border-sky-500/25 bg-sky-500/8"
              )}
            >
              <p className="text-[11px] font-bold text-white">{fact.label}</p>
              <p className="mt-0.5 text-[9px] text-slate-500">{fact.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE C — Diesel Savings Infographic
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseC({ systemKw, annualSavingsInr }: { systemKw: number; annualSavingsInr: number }) {
  const dgHoursWithout = Math.round(systemKw * 2.8);
  const dgHoursWith = Math.round(dgHoursWithout * 0.28);
  const dieselLitresBefore = dgHoursWithout * 0.3 * systemKw;
  const dieselLitresAfter = dgHoursWith * 0.3 * systemKw;
  const fuelSaving = Math.round((dieselLitresBefore - dieselLitresAfter) * 95);

  const metrics = [
    {
      label: "DG Runtime",
      before: `${dgHoursWithout} hrs/yr`,
      after: `${dgHoursWith} hrs/yr`,
      delta: "-72%",
      icon: Battery,
      color: "rose",
    },
    {
      label: "Diesel Usage",
      before: `${Math.round(dieselLitresBefore).toLocaleString("en-IN")} L/yr`,
      after: `${Math.round(dieselLitresAfter).toLocaleString("en-IN")} L/yr`,
      delta: "-72%",
      icon: TrendingDown,
      color: "amber",
    },
    {
      label: "Fuel Cost",
      before: `₹${Math.round(dieselLitresBefore * 95 / 1000).toLocaleString("en-IN")}k/yr`,
      after: `₹${Math.round(dieselLitresAfter * 95 / 1000).toLocaleString("en-IN")}k/yr`,
      delta: `₹${Math.round(fuelSaving / 1000)}k saved`,
      icon: BarChart3,
      color: "emerald",
    },
    {
      label: "Carbon Saved",
      before: `${Math.round(dieselLitresBefore * 2.68 / 1000)} T CO₂/yr`,
      after: `${Math.round(dieselLitresAfter * 2.68 / 1000)} T CO₂/yr`,
      delta: "-72%",
      icon: Leaf,
      color: "teal",
    },
  ];

  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-slate-950 via-rose-950/20 to-slate-900")}
    >
      <div className="relative">
        <SectionLabel>Phase C · Diesel Cost Elimination</SectionLabel>
        <SectionTitle>Your DG Was Burning Money</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Solar dramatically cuts DG runtime — directly reducing fuel bills, noise, and emissions.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            const cBef = "text-rose-400 bg-rose-500/10";
            const cAft =
              m.color === "emerald" ? "text-emerald-400 bg-emerald-500/10" :
              m.color === "teal" ? "text-teal-400 bg-teal-500/10" :
              "text-sky-400 bg-sky-500/10";
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                className="rounded-2xl border border-white/8 bg-white/5 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">{m.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5 text-center bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[9px] font-bold uppercase text-rose-400 mb-1">Without Solar</p>
                    <p className={cn("text-[12px] font-bold", "text-rose-300")}>{m.before}</p>
                  </div>
                  <div className={cn("rounded-xl p-2.5 text-center border", m.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" : m.color === "teal" ? "bg-teal-500/10 border-teal-500/20" : "bg-sky-500/10 border-sky-500/20")}>
                    <p className={cn("text-[9px] font-bold uppercase mb-1", m.color === "emerald" ? "text-emerald-400" : m.color === "teal" ? "text-teal-400" : "text-sky-400")}>With Solar</p>
                    <p className={cn("text-[12px] font-bold", m.color === "emerald" ? "text-emerald-300" : m.color === "teal" ? "text-teal-300" : "text-sky-300")}>{m.after}</p>
                  </div>
                </div>
                <div className="mt-2 rounded-lg bg-white/5 py-1.5 text-center">
                  <span className="text-[11px] font-bold text-white">{m.delta}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE D — Guest Experience Impact
// ═══════════════════════════════════════════════════════════════════════════════

const GUEST_BENEFITS = [
  {
    icon: Shield,
    title: "Zero Power Interruptions",
    desc: "Solar + grid + DG triple protection. Guests never experience blackouts.",
    accent: "sky",
  },
  {
    icon: Star,
    title: "Quieter Operations",
    desc: "DG runs 72% less. Reduced noise means better sleep scores and reviews.",
    accent: "yellow",
  },
  {
    icon: Leaf,
    title: "Eco-Certified Hospitality",
    desc: "LEED / Green Globe certification eligibility. Attract ESG-conscious travellers.",
    accent: "emerald",
  },
  {
    icon: Globe,
    title: "Sustainable Brand Story",
    desc: "\"100% renewable in operation hours\" — a powerful OTA profile differentiator.",
    accent: "teal",
  },
  {
    icon: Award,
    title: "ESG & CSR Reporting",
    desc: "Carbon reduction data ready for annual reports, investor decks, and bank filings.",
    accent: "violet",
  },
  {
    icon: BarChart3,
    title: "Higher Review Scores",
    desc: "Hotels with sustainability programs consistently score higher on Booking.com / TripAdvisor.",
    accent: "indigo",
  },
];

function PhaseD() {
  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-[#0a1020] via-[#0d1627] to-slate-950")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900/25 via-transparent to-transparent" />
      <div className="relative">
        <SectionLabel>Phase D · Guest & Brand Benefits</SectionLabel>
        <SectionTitle>Beyond Cost — A Better Hotel</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Solar is not just a financial investment. It transforms how guests experience and rate your property.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUEST_BENEFITS.map((b, i) => {
            const Icon = b.icon;
            const accentMap: Record<string, string> = {
              sky: "from-sky-500/15 border-sky-500/25 text-sky-400",
              yellow: "from-yellow-500/15 border-yellow-500/25 text-yellow-400",
              emerald: "from-emerald-500/15 border-emerald-500/25 text-emerald-400",
              teal: "from-teal-500/15 border-teal-500/25 text-teal-400",
              violet: "from-violet-500/15 border-violet-500/25 text-violet-400",
              indigo: "from-indigo-500/15 border-indigo-500/25 text-indigo-400",
            };
            const ac = accentMap[b.accent] ?? accentMap.sky;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={cn("flex gap-3 rounded-2xl border bg-gradient-to-br to-transparent p-4", ac)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">{b.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{b.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE E — Hotel Energy Ecosystem Map
// ═══════════════════════════════════════════════════════════════════════════════

const ECO_NODES = [
  { label: "HVAC",         color: "#38bdf8", angle: -90 },
  { label: "Rooms",        color: "#818cf8", angle: -39 },
  { label: "Kitchen",      color: "#fbbf24", angle: 12 },
  { label: "Banquet",      color: "#a78bfa", angle: 63 },
  { label: "Laundry",      color: "#34d399", angle: 114 },
  { label: "Common Area",  color: "#fde68a", angle: 165 },
  { label: "Lifts",        color: "#6ee7b7", angle: 216 },
  { label: "DG Standby",   color: "#f87171", angle: 267 },
];

function PhaseE({ systemKw }: { systemKw: number }) {
  const cx = 150;
  const cy = 150;
  const r = 100;

  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-[#060a14] via-slate-950 to-[#0c1525]")}
    >
      <div className="relative">
        <SectionLabel>Phase E · Energy Ecosystem</SectionLabel>
        <SectionTitle>One Plant, Every Corner</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Your {systemKw} kW solar plant powers every department — simultaneously and silently.
        </p>

        <div className="mt-6 flex justify-center">
          <svg
            viewBox="0 0 300 300"
            className="w-full max-w-[280px]"
            aria-hidden="true"
          >
            {/* Background glow */}
            <defs>
              <radialGradient id="solar-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={48} fill="url(#solar-glow)" />

            {/* Connecting lines */}
            {ECO_NODES.map((node) => {
              const rad = (node.angle * Math.PI) / 180;
              const nx = cx + r * Math.cos(rad);
              const ny = cy + r * Math.sin(rad);
              return (
                <motion.line
                  key={node.label}
                  x1={cx}
                  y1={cy}
                  x2={nx}
                  y2={ny}
                  stroke={node.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
              );
            })}

            {/* Outer nodes */}
            {ECO_NODES.map((node, i) => {
              const rad = (node.angle * Math.PI) / 180;
              const nx = cx + r * Math.cos(rad);
              const ny = cy + r * Math.sin(rad);
              return (
                <motion.g
                  key={node.label}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 * i + 0.5, duration: 0.35, type: "spring" }}
                  style={{ transformOrigin: `${nx}px ${ny}px` }}
                >
                  <circle cx={nx} cy={ny} r={18} fill={node.color + "20"} stroke={node.color} strokeWidth="1.5" />
                  <text
                    x={nx}
                    y={ny + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7"
                    fontWeight="700"
                    fill={node.color}
                  >
                    {node.label.split(" ")[0]}
                  </text>
                </motion.g>
              );
            })}

            {/* Centre solar node */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={36}
              fill="#f59e0b20"
              stroke="#f59e0b"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            />
            <motion.circle
              cx={cx}
              cy={cy}
              r={36}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
            <Sun x={cx - 14} y={cy - 16} width="28" height="28" color="#f59e0b" strokeWidth="1.5" />
            <text
              x={cx}
              y={cy + 18}
              textAnchor="middle"
              fontSize="8"
              fontWeight="800"
              fill="#fcd34d"
            >
              {systemKw} kW
            </text>
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {ECO_NODES.map((n) => (
            <div key={n.label} className="flex flex-col items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: n.color }}
              />
              <span className="text-center text-[8px] font-semibold text-slate-500">{n.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE F — Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseF({
  systemKw,
  annualSavingsInr,
  netCostInr,
  paybackYears,
  annualGenerationKwh,
  carbonKgPerYear,
}: HotelStoryProps) {
  const gen = annualGenerationKwh ?? systemKw * 1450;
  const carbonT = carbonKgPerYear ? carbonKgPerYear / 1000 : (gen * 0.706) / 1000;
  const roiPct = netCostInr > 0 ? Math.round((annualSavingsInr / netCostInr) * 100) : 0;
  const dgReduction = 72;

  const kpis = [
    {
      label: "Annual Savings",
      value: annualSavingsInr,
      prefix: "₹",
      suffix: "",
      unit: "per year",
      color: "emerald",
      decimals: 0,
      display: `₹${(annualSavingsInr / 100000).toFixed(1)}L`,
    },
    {
      label: "DG Reduction",
      value: dgReduction,
      prefix: "",
      suffix: "%",
      unit: "less diesel runtime",
      color: "amber",
      decimals: 0,
      display: `${dgReduction}%`,
    },
    {
      label: "ROI",
      value: roiPct,
      prefix: "",
      suffix: "%",
      unit: "annual return",
      color: "sky",
      decimals: 0,
      display: `${roiPct}%`,
    },
    {
      label: "Payback",
      value: paybackYears,
      prefix: "",
      suffix: " yrs",
      unit: "investment recovery",
      color: "violet",
      decimals: 1,
      display: `${paybackYears.toFixed(1)}y`,
    },
    {
      label: "Solar Generation",
      value: gen,
      prefix: "",
      suffix: " kWh",
      unit: "annual clean energy",
      color: "yellow",
      decimals: 0,
      display: `${Math.round(gen / 1000)}k kWh`,
    },
    {
      label: "CO₂ Avoided",
      value: Math.round(carbonT),
      prefix: "",
      suffix: " T",
      unit: "carbon per year",
      color: "teal",
      decimals: 0,
      display: `${Math.round(carbonT)} T`,
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-300" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-300" },
    sky:     { bg: "bg-sky-500/10",     border: "border-sky-500/25",     text: "text-sky-300" },
    violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-300" },
    yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/25",  text: "text-yellow-300" },
    teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/25",    text: "text-teal-300" },
  };

  return (
    <SectionReveal
      className={cn(sectionBase, "bg-gradient-to-br from-[#06090f] via-[#0c1020] to-[#0a1020]")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent" />
      <div className="relative">
        <SectionLabel>Phase F · Executive Summary</SectionLabel>
        <SectionTitle>The Numbers You Care About</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Key performance metrics for your {systemKw} kW hotel solar system — at a glance.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kpis.map((kpi, i) => {
            const c = colorMap[kpi.color];
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className={cn(
                  "flex flex-col rounded-2xl border p-4",
                  c.bg,
                  c.border
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </p>
                <p className={cn("mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl", c.text)}>
                  {kpi.display}
                </p>
                <p className="mt-1 text-[10px] text-slate-600">{kpi.unit}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-4"
        >
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-white">
              Investment recovers in {paybackYears.toFixed(1)} years — then pure profit for 22+ years.
            </p>
            <p className="text-[11px] text-slate-500">
              25-year panel warranty · No moving parts · Zero fuel cost post-payback
            </p>
          </div>
        </motion.div>
      </div>
    </SectionReveal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export — full hotel story
// ═══════════════════════════════════════════════════════════════════════════════

export function HotelEnergyStory(props: HotelStoryProps) {
  return (
    <div className="space-y-3">
      <PhaseA systemKw={props.systemKw} />
      <PhaseB systemKw={props.systemKw} />
      <PhaseC systemKw={props.systemKw} annualSavingsInr={props.annualSavingsInr} />
      <PhaseD />
      <PhaseE systemKw={props.systemKw} />
      <PhaseF {...props} />
    </div>
  );
}
