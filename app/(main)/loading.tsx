import { Skeleton } from "@/components/ui/skeleton";

/** Fast route-transition shell — keeps main thread paint cheap on mobile/tablet. */
export default function MainLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-9 rounded-full" />
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  );
}
