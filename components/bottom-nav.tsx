"use client";

import Link from "next/link";
import { memo, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { APP_NAV_ROUTES } from "@/lib/app-nav-config";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const PORTAL_ID = "ss-bottom-nav-portal";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BottomNavInner() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalEl(document.getElementById(PORTAL_ID));
  }, []);

  const tree = (
    <div className="ss-bottom-nav-inner w-full max-w-[100vw]">
      <nav
        className={cn(
          "app-chrome-bottom-nav relative z-0 w-full max-w-[100vw] isolate border-t border-white/60 dark:border-white/12",
          "bg-white/95 shadow-[0_-10px_40px_rgba(11,34,64,0.12)] supports-[backdrop-filter]:bg-white/92 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 dark:bg-[#161B22]/92 dark:shadow-[0_-12px_44px_rgba(0,0,0,0.55)] dark:supports-[backdrop-filter]:bg-[#161B22]/88 dark:supports-[backdrop-filter]:backdrop-blur-xl"
        )}
        aria-label="Primary"
      >
        <div className="mx-auto flex w-full max-w-xl flex-row items-stretch justify-between gap-0 px-1 sm:max-w-2xl sm:px-3">
          {APP_NAV_ROUTES.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-bold leading-tight transition-[color,transform,background-color] duration-200 active:scale-[0.97] sm:min-h-[3.5rem] sm:text-[11px]",
                  active
                    ? "text-teal-700 dark:text-teal-300"
                    : "text-slate-500 hover:text-brand-700 dark:text-muted-foreground dark:hover:text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mb-0.5 h-1 w-9 shrink-0 rounded-full transition-[opacity,transform,background-color] duration-200",
                    active
                      ? "bg-teal-500 opacity-100 dark:bg-teal-400"
                      : "scale-90 bg-transparent opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-2xl transition-[color,background-color,box-shadow,transform] duration-200 sm:h-9 sm:w-9",
                    active
                      ? "bg-teal-600 text-white shadow-md dark:bg-teal-500 dark:text-white"
                      : "bg-slate-200/70 text-slate-600 dark:bg-[#161B22]/95 dark:text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      active && "scale-105 text-white"
                    )}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-center tracking-tight",
                    active && "font-extrabold text-teal-800 dark:font-extrabold dark:text-teal-100"
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );

  if (!portalEl) {
    return null;
  }

  return createPortal(tree, portalEl);
}

export const BottomNav = memo(BottomNavInner);
