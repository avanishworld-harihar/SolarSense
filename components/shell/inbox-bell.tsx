"use client";

/**
 * InboxBell — Wave 4 P9.
 *
 * TopBar inbox bell showing unresolved proposal comment count.
 * Polling-based (5s) — lightweight, no Realtime channel needed here.
 * Presence Realtime upgrade comes in Wave 4 P9 Phase 2.
 */

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGlobalUnresolvedCount } from "@/lib/proposal-comments";

export function InboxBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const n = await getGlobalUnresolvedCount();
      if (mounted) setCount(n);
    };

    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={
        count > 0
          ? `Inbox — ${count} unresolved comment${count !== 1 ? "s" : ""}`
          : "Inbox"
      }
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
        "border border-white/70 bg-white/25 text-slate-600",
        "shadow-[0_4px_14px_rgba(11,34,64,0.07),inset_0_1px_0_rgba(255,255,255,0.6)]",
        "backdrop-blur-xl hover:bg-white/40",
        "dark:border-white/12 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.12]"
      )}
    >
      <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />

      {/* Badge */}
      {count > 0 && (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center",
            "rounded-full bg-red-500 px-1 text-[9px] font-bold tabular-nums text-white",
            "ring-2 ring-white dark:ring-[#0d1117]"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
