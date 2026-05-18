"use client";

/**
 * OsShell — the SOL.52 OS-layer shell wrapper (E2).
 *
 * Replaces `AppShell + BottomNav` in app/(main)/layout.tsx.
 * All other uses of AppShell (admin, 404) remain unchanged.
 *
 * Layout (desktop lg+):
 * ┌──────────────────────────────────────────────────────┐
 * │ NavRail (56–216px) │ TopBar (sticky)                 │
 * │ ├─────────────────┤─────────────────────────────────┤
 * │ │ Logo            │ Breadcrumb + WorkspacePill       │
 * │ │ Nav items       │                                  │
 * │ │ ...             │  Page content (scrollable)       │
 * │ │ Theme/Lang      │                                  │
 * └──────────────────────────────────────────────────────┘
 *
 * Layout (mobile/tablet <lg):
 * ┌──────────────────────────────────────────────────────┐
 * │ TopBar (Logo + Search + Theme + Lang)                │
 * │──────────────────────────────────────────────────────│
 * │  Page content (scrollable)                          │
 * │──────────────────────────────────────────────────────│
 * │ BottomNav (portal into #ss-bottom-nav-portal)       │
 * └──────────────────────────────────────────────────────┘
 *
 * Performance:
 *   - NavRail + TopBar + BottomNav are all memo'd or stable — no re-render
 *     on page navigation (same as original AppShell design goal).
 *   - Cmd+K palette renders into document.body via portal.
 *   - applyPerformanceMode called once on mount (same as AppShell).
 *
 * Backward compatibility:
 *   - AppShell, BottomNav, DesktopTopNav remain unchanged.
 *   - pageContainerClass export from app-shell.tsx is untouched.
 *   - All existing routes, proposal flows, public pages are unaffected.
 */

import { useEffect, type ReactNode } from "react";
import { applyPerformanceMode, readPerformanceMode } from "@/lib/performance-mode";
import { ShellProvider, useShell } from "@/lib/shell-context";
import { NavRail } from "@/components/shell/nav-rail";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";

// ─── Keyboard shortcut wiring ─────────────────────────────────────────────────

/**
 * Registers Cmd+K / Ctrl+K global shortcut inside the ShellProvider.
 * Renders nothing — side-effect only.
 */
function ShellKeyboardShortcuts() {
  const { openCommandPalette } = useShell();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCommandPalette]);

  return null;
}

// ─── Inner shell (needs ShellProvider in scope) ───────────────────────────────

function OsShellInner({ children }: { children: ReactNode }) {
  // Replaces AppShell's useEffect for performance mode
  useEffect(() => {
    applyPerformanceMode(readPerformanceMode());
  }, []);

  return (
    <div className="flex min-h-screen min-h-svh w-full max-w-[100vw] overflow-x-hidden">
      {/* Cmd+K wiring */}
      <ShellKeyboardShortcuts />

      {/* ── Desktop left rail (lg+) ─────────────────────────────────── */}
      <NavRail />

      {/* ── Main content column ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky topbar */}
        <TopBar />

        {/* Page content — this is the equivalent of AppShell's <main> */}
        <main className="app-shell flex min-h-0 min-w-0 flex-1 flex-col">
          <section
            className={cn(
              // Container: full width on mobile, capped on large screens
              "mx-auto w-full flex-1 min-h-screen overflow-x-hidden",
              "px-3 pt-3 sm:px-4 sm:space-y-4 sm:pt-4",
              "md:space-y-5 md:px-5 md:pt-5",
              "lg:pt-6 2xl:px-8",
              // Max-width: give content room since rail takes left space
              "max-w-full xl:max-w-[90rem]",
              // Bottom padding: clears mobile bottom-nav + safe area; lg: just 24px
              "pb-[max(6.75rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] lg:pb-6"
            )}
          >
            {children}
          </section>
        </main>
      </div>

      {/* ── Mobile bottom nav (portal, lg:hidden via CSS in globals) ── */}
      <BottomNav />

      {/* ── Cmd+K command palette (portal into body) ─────────────────── */}
      <CommandPalette />
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function OsShell({ children }: { children: ReactNode }) {
  return (
    <ShellProvider>
      <OsShellInner>{children}</OsShellInner>
    </ShellProvider>
  );
}
