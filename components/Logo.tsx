"use client";

import { Sol52Wordmark } from "@/components/sol52-wordmark";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** When the logo sits inside a named control (e.g. home link), hide it from the accessibility tree. */
  decorative?: boolean;
};

export function Logo({ className, decorative }: LogoProps) {
  return (
    <div className={cn("inline-flex bg-transparent", className)}>
      <Sol52Wordmark
        decorative={decorative}
        className="h-full w-full max-h-full object-contain object-left"
      />
    </div>
  );
}
