import { Skeleton } from "@/components/ui/skeleton";

export default function ProposalBuilderLoading() {
  return (
    <div className="ss-page-shell space-y-4" aria-busy="true" aria-label="Loading proposal builder">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
