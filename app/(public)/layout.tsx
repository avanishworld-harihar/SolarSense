/**
 * Sol.52 — public route group for shared customer-facing pages.
 *
 * No app-shell, no bottom nav, no auth chrome. Background is set per-route
 * (proposal layout uses light canvas by default).
 */

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh]">{children}</div>;
}
