import { Skeleton } from "@/components/ui/skeleton";

export default function ProposalWorkspaceLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6 pt-1" aria-busy="true" aria-label="Loading proposal workspace">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
