"use client";

/**
 * Main app layout — E2 OS Shell upgrade.
 *
 * Switches from AppShell + BottomNav to OsShell which provides:
 *   - Adaptive left rail (desktop lg+)
 *   - Enhanced sticky topbar with breadcrumbs + workspace pill
 *   - Cmd+K command palette
 *   - Mobile bottom nav (existing BottomNav, unchanged)
 *   - Connected page transition motion
 *
 * AppShell is NOT removed — it continues to serve admin and 404 pages.
 * All existing routes, proposal flows, and business logic are preserved.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

import { OsShell } from "@/components/shell/os-shell";

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <OsShell>
      {/*
       * Page transition — identical timing to the original layout.
       * AnimatePresence with `initial={false}` prevents the enter animation
       * on first load (matches prior behavior). mode="sync" (default) lets
       * the new page enter immediately while the old one exits.
       */}
      <AnimatePresence initial={false}>
        <motion.div
          key={pathname}
          initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </OsShell>
  );
}
