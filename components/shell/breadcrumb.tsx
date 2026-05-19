"use client";

/**
 * ShellBreadcrumb — contextual breadcrumb trail in the TopBar.
 *
 * Auto-generated from the current pathname. Visible only on desktop (lg+)
 * via the parent TopBar — no additional visibility control needed here.
 *
 * Resolves route → label using the i18n `t()` function so Hindi mode
 * shows localised names automatically.
 *
 * Future phases (E5/E9) can supply richer labels (customer name, proposal
 * title, etc.) via ShellContext.activeWorkspace.label — the breadcrumb
 * will use it for the deepest crumb when available.
 */

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useShell } from "@/lib/shell-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Crumb = {
  label: string;
  href: string;
  /** true = current page (not clickable) */
  active: boolean;
};

// ─── Builder ─────────────────────────────────────────────────────────────────

function buildCrumbs(
  pathname: string,
  t: (k: string) => string,
  activeWorkspaceLabel?: string
): Crumb[] {
  const home: Crumb = { label: t("nav_dashboard"), href: "/", active: false };

  // Dashboard root
  if (pathname === "/") {
    return [{ ...home, active: true }];
  }

  // Customers
  if (pathname.startsWith("/customers")) {
    const crumbs: Crumb[] = [home, { label: t("nav_customers"), href: "/customers", active: pathname === "/customers" }];
    if (pathname !== "/customers") {
      crumbs.push({ label: activeWorkspaceLabel ?? "Profile", href: pathname, active: true });
    }
    return crumbs;
  }

  // Projects
  if (pathname.startsWith("/projects")) {
    const crumbs: Crumb[] = [home, { label: t("nav_projects"), href: "/projects", active: pathname === "/projects" }];
    if (pathname !== "/projects") {
      crumbs.push({ label: activeWorkspaceLabel ?? "Details", href: pathname, active: true });
    }
    return crumbs;
  }

  // Workspace deal route
  if (pathname.startsWith("/workspace")) {
    const proposalHub: Crumb = { label: t("nav_proposals"), href: "/proposals", active: false };
    return [
      home,
      proposalHub,
      { label: activeWorkspaceLabel ?? "Workspace", href: pathname, active: true },
    ];
  }

  // Proposals (hub + builder + detail)
  if (pathname.startsWith("/proposals") || pathname.startsWith("/proposal")) {
    const proposalHub: Crumb = { label: t("nav_proposals"), href: "/proposals", active: pathname === "/proposals" };
    const crumbs: Crumb[] = [home, proposalHub];
    if (pathname === "/proposal") {
      crumbs.push({ label: "New Proposal", href: "/proposal", active: true });
    } else if (pathname !== "/proposals") {
      crumbs.push({ label: activeWorkspaceLabel ?? "Proposal", href: pathname, active: true });
    }
    return crumbs;
  }

  // More / Settings
  if (pathname.startsWith("/more")) {
    return [home, { label: t("nav_more"), href: "/more", active: true }];
  }

  return [home];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShellBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { activeWorkspace } = useShell();

  const crumbs = buildCrumbs(pathname, t, activeWorkspace?.label);

  // Hide if only one crumb (dashboard)
  if (crumbs.length <= 1 && crumbs[0]?.active) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
          {crumbs[0].label}
        </span>
      </div>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex min-w-0 items-center gap-0.5", className)}
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href + i} className="flex min-w-0 items-center gap-0.5">
          {i > 0 && (
            <ChevronRight
              className="mx-0.5 h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
          )}
          {crumb.active ? (
            <span
              aria-current="page"
              className="min-w-0 truncate text-[11px] font-bold text-slate-800 dark:text-slate-100"
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="min-w-0 truncate text-[11px] font-medium text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
