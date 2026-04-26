"use client";

import Link from "next/link";
import { memo } from "react";
import { usePathname } from "next/navigation";

import { APP_NAV_ROUTES } from "@/lib/app-nav-config";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopTopNavInner() {
  const pathname = usePathname();
  const { t } = useLanguage();
  return (
    <nav
      className="hidden min-h-0 min-w-0 flex-1 items-center justify-center gap-1 self-center lg:flex xl:gap-1.5"
      aria-label="Main"
    >
      {APP_NAV_ROUTES.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 py-0 text-xs font-semibold transition-all xl:h-10 xl:px-3 xl:text-sm",
              active
                ? "glass-surface-subtle text-brand-800 ring-1 ring-white/60 after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-2/3 after:-translate-x-1/2 after:rounded-full after:bg-teal-500 dark:text-foreground dark:ring-white/10"
                : "text-slate-700 hover:bg-white/40 hover:text-brand-800 hover:backdrop-blur-sm dark:text-muted-foreground dark:hover:bg-white/[0.08] dark:hover:text-foreground"
            )}
          >
            <Icon
              className={cn("h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4", active && "text-solar-600 dark:text-emerald-400")}
              aria-hidden
            />
            <span className="hidden lg:inline">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const DesktopTopNav = memo(DesktopTopNavInner);
