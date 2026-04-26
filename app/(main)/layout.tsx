"use client";

import { AppShell } from "@/components/app-shell";
import { BottomNav } from "@/components/bottom-nav";
import { useLanguage } from "@/lib/language-context";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

function shellTitle(pathname: string, t: (key: string) => string): string {
  const p = pathname || "/";
  if (p === "/") return t("dashboard_title");
  if (p.startsWith("/customers")) return t("customers_title");
  if (p.startsWith("/projects")) return t("projects_title");
  if (p.startsWith("/proposal")) return t("proposal_title");
  if (p.startsWith("/more")) return t("more_title");
  return t("dashboard_title");
}

/**
 * Keeps header + bottom nav mounted across primary app routes (big win for iPad tab taps).
 */
export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  return (
    <>
      <AppShell title={shellTitle(pathname, t)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <BottomNav />
    </>
  );
}
