"use client";

/**
 * TopBar — sticky application header for the OS shell.
 *
 * Replaces the header inside AppShell (which is used only by admin + 404 pages now).
 *
 * Responsive behavior:
 *   Mobile (<lg):
 *     [Logo] ─── [spacer] ─── [SearchBtn] [ThemeToggle] [LangToggle]
 *
 *   Desktop (lg+):
 *     [Breadcrumb + WorkspacePill] ─── [spacer] ─── [SearchPill] [ThemeToggle] [LangToggle]
 *     (Logo is in NavRail — no logo in topbar on desktop)
 *
 * The Cmd+K button opens CommandPalette via ShellContext.
 * ThemeToggle and LanguageToggle:
 *   - Mobile: rendered here (no other place)
 *   - Desktop: rendered in NavRail bottom; hidden here via `lg:hidden`
 */

import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { ShellBreadcrumb } from "@/components/shell/breadcrumb";
import { WorkspacePill } from "@/components/shell/workspace-pill";
import { InboxBell } from "@/components/shell/inbox-bell";
import { useShell } from "@/lib/shell-context";

// ─── Search trigger variants ──────────────────────────────────────────────────

/** Pill-shaped "Search… ⌘K" — shown on sm+ desktop */
function SearchPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open command palette (Ctrl+K / ⌘K)"
      className={cn(
        "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:flex",
        "border-slate-200/80 bg-slate-100/60 text-slate-500",
        "hover:bg-slate-200/80 hover:text-slate-700",
        "dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
        "dark:hover:bg-white/10 dark:hover:text-slate-200"
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
      <span>Search…</span>
      <kbd
        aria-hidden
        className="hidden rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] dark:bg-white/10 lg:block"
      >
        ⌘K
      </kbd>
    </button>
  );
}

/** Icon-only search button — mobile only */
function SearchIconBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        "border border-white/70 bg-white/25 text-slate-600",
        "shadow-[0_4px_14px_rgba(11,34,64,0.07),inset_0_1px_0_rgba(255,255,255,0.6)]",
        "backdrop-blur-xl transition-colors hover:bg-white/40",
        "dark:border-white/12 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.12]",
        "sm:hidden"
      )}
    >
      <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </button>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const { openCommandPalette } = useShell();

  return (
    <header
      className={cn(
        "sticky top-0 z-[100]",
        "flex h-[3.75rem] w-full shrink-0 items-center gap-3",
        "border-b border-white/30 dark:border-white/8",
        "bg-white/90 backdrop-blur-[10px] backdrop-saturate-150",
        "dark:bg-[#0d1117]/88 dark:backdrop-saturate-100",
        "shadow-[0_2px_16px_rgba(15,35,62,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.32)]",
        "px-3 sm:px-4 lg:px-5"
      )}
    >
      {/* ── Mobile: Brand logo (hidden on desktop — NavRail has it) ───── */}
      <div className="shrink-0 lg:hidden">
        <BrandLogo />
      </div>

      {/* ── Desktop: Breadcrumb + workspace pill ─────────────────────── */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
        <ShellBreadcrumb />
        <WorkspacePill />
      </div>

      {/* ── Mobile: flex spacer ───────────────────────────────────────── */}
      <div className="min-w-0 flex-1 lg:hidden" aria-hidden />

      {/* ── Search ────────────────────────────────────────────────────── */}
      <SearchPill onClick={openCommandPalette} />
      <SearchIconBtn onClick={openCommandPalette} />

      {/* ── Inbox bell (Wave 4 P9) ─────────────────────────────────────── */}
      <InboxBell />

      {/* ── Theme + Language toggles (mobile only — on desktop in rail) ─ */}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}
