"use client";

/**
 * ProposalPresentClient — Wave 4 P8.
 *
 * Fullscreen presentation mode for solar proposals.
 * Accessed via /proposal/[id]/present.
 *
 * iPad landscape first (1024×768), also works on mobile (375px) and desktop.
 *
 * Features:
 *   - One block per slide, fullscreen
 *   - Keyboard: ArrowLeft / ArrowRight / Escape (exit)
 *   - Tap: left/right half tap zones
 *   - Swipe: touch start/end horizontal swipe detection
 *   - Progress: dot indicators (max 10 shown) + slide counter
 *   - Slide transitions: horizontal slide with AnimatePresence
 *   - Dark mode toggle (persisted)
 *   - Exit button → back to /proposal/[id]
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  X,
  Expand,
} from "lucide-react";

import type { ProposalDocument } from "@/lib/proposal-document-ir";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import type { BlockRenderKey } from "@/lib/proposal-web-renderer-registry";
import type { ProposalPresetId } from "@/lib/proposal-preset-engine";
import { resolveStoryVariant } from "@/lib/proposal-preset-engine";
import { getEnabledProposalBlocksInOrder } from "@/lib/proposal-layout-merge";
import {
  WEB_RENDERER_REGISTRY,
  isBlockEligible,
} from "@/lib/proposal-web-renderer-registry";
import { dict, monthLabels } from "@/lib/proposal-i18n";
import type { ProposalLang } from "@/lib/proposal-i18n";
import { hindiHonoredDisplayName } from "@/lib/roman-name-to-devanagari";
import { readProposalWebTheme, writeProposalWebTheme } from "@/lib/proposal-web-theme";
import { renderBlockByKey } from "@/components/proposal/web-renderer";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideEntry = {
  blockId: string;
  renderKey: BlockRenderKey;
  pageDataAttr: string;
};

type Props = {
  document: ProposalDocument;
  billAuditBacked: boolean;
  showSurveyWorkflowSection?: boolean;
};

// ─── Hook: keyboard & swipe ───────────────────────────────────────────────────

function useSlideNavigation(
  total: number,
  onChange: (dir: -1 | 1) => void,
  onEscape: () => void
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") onChange(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") onChange(-1);
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange, onEscape, total]);
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  dark,
}: {
  total: number;
  current: number;
  dark: boolean;
}) {
  const MAX_DOTS = 12;
  const showDots = total <= MAX_DOTS;

  if (!showDots) {
    return (
      <span className={`text-xs font-semibold tabular-nums ${dark ? "text-white/60" : "text-black/50"}`}>
        {current + 1} / {total}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? `h-2 w-5 ${dark ? "bg-white" : "bg-slate-800"}`
              : `h-1.5 w-1.5 ${dark ? "bg-white/30" : "bg-black/20"}`
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProposalPresentClient({
  document: doc,
  billAuditBacked,
  showSurveyWorkflowSection = false,
}: Props) {
  const [lang, setLang] = useState<ProposalLang>(doc.lang ?? "en");
  const [darkMode, setDarkMode] = useState(true); // dark by default for presentations
  const [slideIdx, setSlideIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch state
  const touchStartX = useRef<number | null>(null);

  // Theme init
  useEffect(() => {
    const stored = readProposalWebTheme();
    setDarkMode(stored !== "light"); // default dark for presentations
  }, []);

  useEffect(() => {
    writeProposalWebTheme(darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!globalThis.document) return;
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => undefined);
    } else {
      globalThis.document.exitFullscreen?.().catch(() => undefined);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!globalThis.document.fullscreenElement);
    globalThis.document?.addEventListener("fullscreenchange", onFsChange);
    return () => globalThis.document?.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Derived data
  const rawInput = (doc.raw_input as PremiumProposalPptInput) ?? ({} as PremiumProposalPptInput);
  const D = dict(lang);
  const monthLbls = monthLabels(lang);
  const presetId = doc.preset_id as ProposalPresetId;

  const honoredDisplay = useMemo(
    () =>
      lang === "hi"
        ? hindiHonoredDisplayName(doc.customer.honored_name)
        : doc.customer.honored_name,
    [lang, doc.customer.honored_name]
  );

  const installer = {
    name: doc.installer.name,
    contact: doc.installer.contact ?? "",
    tagline: doc.installer.tagline ?? "",
  };

  const summary = useMemo(() => {
    const raw = (doc.raw_input as Record<string, unknown> | undefined)?.summary as
      | import("@/lib/proposal-ppt").ProposalDeckSummary
      | undefined;
    return raw;
  }, [doc]);

  const storyVariant = resolveStoryVariant(
    presetId,
    rawInput.storySegment ?? null,
    rawInput.storyMode ?? null,
    lang
  );

  // Build slide list
  const slides = useMemo<SlideEntry[]>(() => {
    const eligCtx = { billAuditBacked, presetId, showSurveySection: showSurveyWorkflowSection };
    const enabledBlocks = getEnabledProposalBlocksInOrder(doc.layout);
    const seen = new Set<BlockRenderKey>();
    const result: SlideEntry[] = [];

    for (const blockId of enabledBlocks) {
      const meta = WEB_RENDERER_REGISTRY[blockId as keyof typeof WEB_RENDERER_REGISTRY];
      if (!meta) continue;
      if (!isBlockEligible(blockId as import("@/lib/proposal-block-registry").ProposalBlockId, eligCtx)) continue;
      if (seen.has(meta.renderKey)) continue;
      seen.add(meta.renderKey);
      result.push({ blockId, renderKey: meta.renderKey, pageDataAttr: meta.pageDataAttr });
    }
    return result;
  }, [doc.layout, billAuditBacked, presetId, showSurveyWorkflowSection]);

  const total = slides.length;

  // Navigation
  const go = useCallback(
    (dir: 1 | -1) => {
      setDirection(dir);
      setSlideIdx((prev) => Math.max(0, Math.min(total - 1, prev + dir)));
    },
    [total]
  );

  const exitPresent = useCallback(() => {
    if (globalThis.document?.fullscreenElement) {
      globalThis.document.exitFullscreen?.().catch(() => undefined);
    }
    window.history.back();
  }, []);

  useSlideNavigation(total, go, exitPresent);

  // Touch / swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1);
      touchStartX.current = null;
    },
    [go]
  );

  if (!summary) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm opacity-60">Unable to render presentation — missing summary data.</p>
      </div>
    );
  }

  const ctx: BlockRenderContext = {
    summary,
    pptInput: rawInput,
    lang,
    monthLbls,
    D,
    darkMode,
    honoredDisplay,
    proposalId: doc.proposal_id,
    presetId,
    installer,
    installerLogoUrl: doc.installer.logo_url ?? undefined,
    siteImages: rawInput.siteImages,
    billAuditBacked,
    showSurveyWorkflowSection,
    selectedAmcYears: 1,
    onAmcChange: () => undefined,
    onShare: () => undefined,
    onDownload: () => undefined,
    downloading: false,
    storyVariant,
  };

  const slide = slides[slideIdx];

  // Slide transition variants
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const bg = darkMode
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100";

  return (
    <MotionConfig transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }} reducedMotion="user">
      <div
        ref={containerRef}
        className={`relative flex h-[100dvh] w-full flex-col overflow-hidden ${bg} ${
          lang === "hi" ? "lang-hi" : ""
        }`}
        data-theme={darkMode ? "dark" : "light"}
        data-preset={presetId}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div
          className={`relative z-20 flex h-12 shrink-0 items-center gap-3 px-4 ${
            darkMode
              ? "border-b border-white/5 bg-black/30 backdrop-blur-xl"
              : "border-b border-black/5 bg-white/60 backdrop-blur-xl"
          }`}
        >
          {/* Exit */}
          <button
            onClick={exitPresent}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              darkMode
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-black/50 hover:bg-black/5 hover:text-black"
            }`}
            aria-label="Exit presentation"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Customer name */}
          <span
            className={`min-w-0 flex-1 truncate text-sm font-medium ${
              darkMode ? "text-white/80" : "text-slate-700"
            }`}
          >
            {doc.customer.name}
          </span>

          {/* Controls right side */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === "hi" ? "en" : "hi")}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                darkMode
                  ? "bg-white/10 text-white/70 hover:bg-white/20"
                  : "bg-black/5 text-black/50 hover:bg-black/10"
              }`}
            >
              {lang === "hi" ? "EN" : "HI"}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                darkMode
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-black/50 hover:bg-black/5 hover:text-black"
              }`}
              aria-label={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                darkMode
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-black/50 hover:bg-black/5 hover:text-black"
              }`}
              aria-label="Toggle fullscreen"
            >
              <Expand className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Slide area ──────────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* Tap zones */}
          <button
            onClick={() => go(-1)}
            disabled={slideIdx === 0}
            className="absolute inset-y-0 left-0 z-10 w-16 focus:outline-none disabled:pointer-events-none"
            aria-label="Previous slide"
          />
          <button
            onClick={() => go(1)}
            disabled={slideIdx === total - 1}
            className="absolute inset-y-0 right-0 z-10 w-16 focus:outline-none disabled:pointer-events-none"
            aria-label="Next slide"
          />

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={`slide-${slideIdx}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 overflow-y-auto overscroll-contain"
              data-page={slide?.pageDataAttr}
            >
              {/* Slide content wrapper — max-width for iPad landscape */}
              <div className="mx-auto w-full max-w-[960px] px-4 pb-24 pt-6 sm:px-10 sm:pt-10">
                {slide && renderBlockByKey(slide.renderKey, ctx)}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom nav bar ───────────────────────────────────────────────── */}
        <div
          className={`relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 px-4 ${
            darkMode
              ? "border-t border-white/5 bg-black/30 backdrop-blur-xl"
              : "border-t border-black/5 bg-white/60 backdrop-blur-xl"
          }`}
        >
          {/* Prev */}
          <button
            onClick={() => go(-1)}
            disabled={slideIdx === 0}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
              darkMode
                ? "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                : "bg-black/5 text-slate-700 hover:bg-black/10 active:scale-95"
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Progress */}
          <div className="flex flex-1 justify-center">
            <ProgressDots total={total} current={slideIdx} dark={darkMode} />
          </div>

          {/* Next */}
          <button
            onClick={() => go(1)}
            disabled={slideIdx === total - 1}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
              darkMode
                ? "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                : "bg-black/5 text-slate-700 hover:bg-black/10 active:scale-95"
            }`}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Slide counter badge */}
        <div
          className={`absolute bottom-16 right-4 z-30 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
            darkMode
              ? "bg-white/10 text-white/50 backdrop-blur"
              : "bg-black/5 text-black/40"
          }`}
        >
          {slideIdx + 1} / {total}
        </div>
      </div>
    </MotionConfig>
  );
}
