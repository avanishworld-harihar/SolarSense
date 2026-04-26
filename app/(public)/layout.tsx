/**
 * Sol.52 — public route group for shared customer-facing pages.
 *
 * No app-shell, no bottom nav, no auth chrome. The body class still inherits
 * the global `mesh-gradient-bg` from `app/layout.tsx`, so we override it
 * here with a clean white canvas via the wrapper div.
 */

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-white text-slate-900">{children}</div>;
}
