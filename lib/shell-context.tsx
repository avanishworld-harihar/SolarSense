"use client";

/**
 * ShellContext — global OS-shell state for SOL.52.
 *
 * Provides:
 *   - commandPaletteOpen / openCommandPalette / closeCommandPalette
 *   - activeWorkspace — the "deal" currently open, cross-route persistence
 *     Future phases (E5/E9) will wire the proposal builder to set activeWorkspace.
 *     For now it is populated from pathname by WorkspacePill automatically.
 *
 * Consumed by: OsShell, TopBar, NavRail, CommandPalette, WorkspacePill.
 * NOT consumed by: proposal generation, billing logic, or any (public) routes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceType = "proposal" | "customer" | "project";

export type ActiveWorkspace = {
  /** Unique ID for the deal/project (proposal.id, customer.id, etc.) */
  id: string;
  /** Display label shown in the workspace pill */
  label: string;
  /** Link that takes the user back to this workspace */
  href: string;
  /** Used to pick the pill accent color */
  type: WorkspaceType;
};

export type ShellContextValue = {
  /** Whether the Cmd+K command palette is open */
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  /**
   * The currently "active" deal / workspace.
   * Null when the user is at a hub/list view.
   * Set by individual workspace pages in E5+ (proposal builder, customer detail, etc.).
   * WorkspacePill auto-detects from pathname as a fallback.
   */
  activeWorkspace: ActiveWorkspace | null;
  setActiveWorkspace: (ws: ActiveWorkspace | null) => void;
  clearActiveWorkspace: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ShellContext = createContext<ShellContextValue>({
  commandPaletteOpen: false,
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  clearActiveWorkspace: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ShellProvider({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState<ActiveWorkspace | null>(null);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const setActiveWorkspace = useCallback(
    (ws: ActiveWorkspace | null) => setActiveWorkspaceState(ws),
    []
  );
  const clearActiveWorkspace = useCallback(() => setActiveWorkspaceState(null), []);

  return (
    <ShellContext.Provider
      value={{
        commandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        activeWorkspace,
        setActiveWorkspace,
        clearActiveWorkspace,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useShell(): ShellContextValue {
  return useContext(ShellContext);
}
