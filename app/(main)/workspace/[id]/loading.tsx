import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceDealLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6 pt-1" aria-busy="true" aria-label="Loading workspace">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
