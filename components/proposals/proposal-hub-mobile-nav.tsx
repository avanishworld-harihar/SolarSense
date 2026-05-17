"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

/** Fixed bar when pipeline scrolls off-screen — always a way back to the list */
export function ProposalHubMobileNav({
  visible,
  customerName,
  onShowPipeline,
  lang = "en",
  className
}: {
  visible: boolean;
  customerName: string;
  onShowPipeline: () => void;
  lang?: "en" | "hi";
  className?: string;
}) {
  return (
    <motion.div
      role="navigation"
      aria-label={lang === "hi" ? "प्रस्ताव नेविगेशन" : "Proposal navigation"}
      aria-hidden={!visible}
      className={cn(
        "proposal-hub-mobile-sticky-nav fixed inset-x-0 z-30 border-t px-3 py-2.5 shadow-[0_-8px_32px_rgba(11,34,64,0.12)] transition-[transform,opacity] duration-200 md:hidden print:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        className
      )}
      style={{
        bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))"
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="proposal-hub-mobile-sticky-nav-btn h-10 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm"
          onClick={onShowPipeline}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {lang === "hi" ? "सूची" : "List"}
        </Button>
        <p className="proposal-hub-text-primary min-w-0 flex-1 truncate text-sm font-semibold">{customerName}</p>
      </div>
    </motion.div>
  );
}
