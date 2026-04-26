import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ss-skeleton-shimmer rounded-xl bg-muted/80", className)} {...props} />;
}

export { Skeleton };
