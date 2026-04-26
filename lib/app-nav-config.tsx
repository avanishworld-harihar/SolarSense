import type { LucideIcon } from "lucide-react";
import { Ellipsis, FileText, FolderOpen, LayoutDashboard, Users } from "lucide-react";

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
  { href: "/proposal", labelKey: "nav_proposal", icon: FileText },
  { href: "/more", labelKey: "nav_more", icon: Ellipsis }
];
