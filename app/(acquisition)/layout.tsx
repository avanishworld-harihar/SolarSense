/**
 * Isolated acquisition layout — no installer shell, no dashboard chrome.
 * Harihar Solar and similar public funnels live under this route group only.
 */
export default function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#030508] text-slate-100 antialiased">{children}</div>
  );
}
