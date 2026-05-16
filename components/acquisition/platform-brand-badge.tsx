import Image from "next/image";
import { PLATFORM_LOGO_SRC, PLATFORM_NAME, POWERED_BY_LINE, type PlatformBrandSurface } from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

type PlatformBrandBadgeProps = {
  surface?: PlatformBrandSurface;
  /** `footer` — quiet line under the page; `inline` — compact row by the calculator; `engine` — legacy alias, same as inline. */
  variant?: "footer" | "inline" | "engine";
  className?: string;
  showLogo?: boolean;
};

/**
 * Reusable platform credit for acquisition surfaces. Harihar stays the hero;
 * this is a single, plain-English line so SOL.52 reads as infrastructure — not marketing noise.
 */
export function PlatformBrandBadge({
  surface = "acquisition_calculator",
  variant = "footer",
  className,
  showLogo
}: PlatformBrandBadgeProps) {
  /** Inline stays text-first so SOL.52 reads quiet; opt in with `showLogo` when space allows. */
  const withLogo = showLogo ?? variant === "engine";

  if (variant === "footer") {
    return (
      <footer
        className={cn("text-center", className)}
        data-platform-surface={surface}
        aria-label={`${PLATFORM_NAME} platform attribution`}
      >
        <p className="text-[11px] leading-relaxed text-slate-500">
          <span className="text-slate-400">{POWERED_BY_LINE}</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="text-slate-500">Same engine we use for tariffs and customer proposals.</span>
        </p>
      </footer>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)} data-platform-surface={surface}>
      {withLogo ? (
        <Image
          src={PLATFORM_LOGO_SRC}
          alt=""
          width={72}
          height={20}
          className="h-3.5 w-auto opacity-70"
          unoptimized
        />
      ) : null}
      <span className="text-[11px] font-medium text-slate-500">{POWERED_BY_LINE}</span>
    </div>
  );
}
