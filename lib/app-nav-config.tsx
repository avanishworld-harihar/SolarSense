import type { LucideIcon } from "lucide-react";
import { Ellipsis, FolderOpen, LayoutDashboard, LayoutGrid, Users } from "lucide-react";

export type AppNavRoute = {
  href: string;
  /** Key into `translations` / `t()` */
  labelKey: string;
  icon: LucideIcon;
};

export const APP_NAV_ROUTES: AppNavRoute[] = [
  { href: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { href: "/customers", labelKey: "nav_customers", icon: Users },
  { href: "/projects", labelKey: "nav_projects", icon: FolderOpen },
  { href: "/proposals", labelKey: "nav_proposals", icon: LayoutGrid },
  { href: "/more", labelKey: "nav_more", icon: Ellipsis }
];
