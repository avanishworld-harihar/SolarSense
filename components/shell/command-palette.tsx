"use client";

/**
 * CommandPalette — SOL.52 universal search + navigation (Cmd+K / Ctrl+K).
 *
 * Built with no external dialog library — pure Framer Motion overlay +
 * portal into document.body.
 *
 * Features:
 *   - Keyboard: Arrow keys navigate, Enter selects, Escape closes
 *   - Fuzzy search across all nav items + quick actions
 *   - Grouped by category (Quick Actions, Navigation)
 *   - Dark mode aware
 *   - Accessible (role=dialog, aria-modal, focus-trap via autoFocus on input)
 *
 * Future phases (E7/E9) can add:
 *   - Recent proposals section (read from Supabase)
 *   - Customer search (debounced API)
 *   - Preset launch shortcuts
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShell } from "@/lib/shell-context";

// ─── Data ─────────────────────────────────────────────────────────────────────

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  category: "Quick Actions" | "Navigation";
  shortcut?: string;
};

const ALL_ITEMS: CommandItem[] = [
  // Quick actions
  {
    id: "new-proposal",
    label: "New Proposal",
    description: "Open the solar proposal builder",
    href: "/proposal",
    icon: Plus,
    category: "Quick Actions",
    shortcut: "N",
  },
  {
    id: "proposals-hub",
    label: "Proposals Hub",
    description: "View all proposals and pipeline",
    href: "/proposals",
    icon: LayoutGrid,
    category: "Quick Actions",
  },
  {
    id: "settings",
    label: "Settings & Branding",
    description: "Configure installer name, logo, and preferences",
    href: "/more",
    icon: Settings,
    category: "Quick Actions",
  },
  // Navigation
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Solar business overview and key metrics",
    href: "/",
    icon: LayoutDashboard,
    category: "Navigation",
  },
  {
    id: "nav-customers",
    label: "Customers",
    description: "Manage leads and customer profiles",
    href: "/customers",
    icon: Users,
    category: "Navigation",
  },
  {
    id: "nav-projects",
    label: "Projects",
    description: "Track solar installation projects",
    href: "/projects",
    icon: FolderOpen,
    category: "Navigation",
  },
  {
    id: "nav-proposals",
    label: "Proposals",
    description: "Proposal pipeline and documents",
    href: "/proposals",
    icon: FileText,
    category: "Navigation",
  },
];

const CATEGORIES: CommandItem["category"][] = ["Quick Actions", "Navigation"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return text.toLowerCase().includes(q);
}

function filterItems(query: string): CommandItem[] {
  return ALL_ITEMS.filter(
    (item) =>
      fuzzyMatch(query, item.label) ||
      fuzzyMatch(query, item.description ?? "")
  );
}

// ─── Inner (rendered in portal) ───────────────────────────────────────────────

function PaletteInner() {
  const { commandPaletteOpen, closeCommandPalette } = useShell();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = filterItems(query);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      closeCommandPalette();
      setQuery("");
      setSelectedIndex(0);
    },
    [router, closeCommandPalette]
  );

  // Auto-focus + reset when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay ensures the animation starts before focus
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeCommandPalette();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, filtered, selectedIndex, handleSelect, closeCommandPalette]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-sm"
            onClick={closeCommandPalette}
            aria-hidden
          />

          {/* Palette modal */}
          <motion.div
            role="dialog"
            aria-label="Command palette — search or navigate"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-4 top-[8vh] z-[501] mx-auto max-w-lg overflow-hidden",
              "rounded-2xl border border-white/50",
              "bg-white/96 shadow-[0_24px_80px_rgba(11,34,64,0.22)]",
              "backdrop-blur-2xl backdrop-saturate-150",
              "dark:border-white/10 dark:bg-slate-900/96 dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            )}
          >
            {/* Search field */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3.5 dark:border-white/8">
              <Search
                className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                strokeWidth={2.25}
                aria-hidden
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or jump to…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                aria-autocomplete="list"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <kbd className="hidden shrink-0 rounded border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 sm:block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Zap className="h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No results for <span className="font-semibold">"{query}"</span>
                  </p>
                </div>
              ) : (
                CATEGORIES.map((cat) => {
                  const items = filtered.filter((i) => i.category === cat);
                  if (!items.length) return null;

                  // Global index offset for this category
                  const offset = filtered.indexOf(items[0]);

                  return (
                    <div key={cat} className="mb-1">
                      <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {cat}
                      </p>
                      {items.map((item, localIdx) => {
                        const gIdx = offset + localIdx;
                        const selected = gIdx === selectedIndex;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            role="option"
                            aria-selected={selected}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(gIdx)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              selected
                                ? "bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100"
                                : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-white/5"
                            )}
                          >
                            {/* Icon well */}
                            <span
                              aria-hidden
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                selected
                                  ? "bg-teal-600 text-white dark:bg-teal-500"
                                  : "bg-slate-100 text-slate-500 dark:bg-white/8 dark:text-slate-400"
                              )}
                            >
                              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                            </span>

                            {/* Label + description */}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">
                                {item.label}
                              </span>
                              {item.description && (
                                <span className={cn(
                                  "block text-[11px] leading-tight",
                                  selected
                                    ? "text-teal-600/80 dark:text-teal-300/70"
                                    : "text-slate-400 dark:text-slate-500"
                                )}>
                                  {item.description}
                                </span>
                              )}
                            </span>

                            {/* Enter key badge on selected */}
                            {selected && (
                              <kbd
                                aria-hidden
                                className="shrink-0 rounded border border-teal-200 bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600 dark:border-teal-700/60 dark:bg-teal-500/20 dark:text-teal-300"
                              >
                                ↵
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-2 dark:border-white/8">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                SOL.52 Command Center
              </span>
              <div className="flex items-center gap-3">
                {[
                  { key: "↑↓", label: "navigate" },
                  { key: "↵", label: "open" },
                ].map(({ key, label }) => (
                  <span
                    key={key}
                    className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500"
                  >
                    <kbd className="rounded border border-slate-200 bg-slate-100/80 px-1 font-mono text-[9px] dark:border-white/10 dark:bg-white/5">
                      {key}
                    </kbd>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Exported component (portal guard) ───────────────────────────────────────

/**
 * Mount at the root of the shell. Renders into document.body via portal.
 * The <Suspense>/<use client> boundary is already at the layout level.
 */
export function CommandPalette() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<PaletteInner />, document.body);
}
