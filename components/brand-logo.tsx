"use client";

import Link from "next/link";

import { Logo } from "@/components/Logo";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  href?: string;
};

/** Box keeps header layout stable. */
const LOGO_BOX = cn(
  "relative shrink-0 overflow-visible",
  "h-[3.8rem] w-[11rem] sm:h-[4.3rem] sm:w-[13rem] md:h-[4.5rem] md:w-[13.5rem] lg:h-[4.75rem] lg:w-[14.5rem]"
);

export function BrandLogo({ className, href = "/" }: BrandLogoProps) {
  const inner = (
    <div className={cn(LOGO_BOX, "bg-transparent", className)}>
      <Logo className="absolute inset-0 h-full w-full" decorative={!!href} />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex shrink-0 items-center rounded-md bg-transparent outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500/80"
        aria-label={`${APP_DISPLAY_NAME} home`}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
