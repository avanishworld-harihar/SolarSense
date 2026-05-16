import Image from "next/image";
import {
  INTELLIGENCE_ENGINE_LINE,
  PLATFORM_LOGO_SRC,
  PLATFORM_NAME,
  POWERED_BY_LINE,
  type PlatformBrandSurface
} from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

type PlatformBrandBadgeProps = {
  surface?: PlatformBrandSurface;
  /** `footer` — default acquisition footer; `inline` — compact row; `engine` — Intelligence Engine line only. */
  variant?: "footer" | "inline" | "engine";
  className?: string;
  showLogo?: boolean;
};

/**
 * Reusable platform credit for acquisition surfaces. Local brand stays primary in page chrome;
 * this component only attributes calculators, forms, and results to SOL.52.
 */
export function PlatformBrandBadge({
  surface = "acquisition_calculator",
  variant = "footer",
  className,
  showLogo
}: PlatformBrandBadgeProps) {
  const line = variant === "engine" ? INTELLIGENCE_ENGINE_LINE : POWERED_BY_LINE;
  const withLogo = showLogo ?? variant === "inline";

  if (variant === "footer") {
    return (
      <footer
        className={cn("text-center", className)}
        data-platform-surface={surface}
        aria-label={`${PLATFORM_NAME} platform attribution`}
      >
        <p className="text-[11px] text-slate-500">
          Calculator engine{" "}
          <span className="font-medium text-slate-400">{POWERED_BY_LINE}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-slate-600">{INTELLIGENCE_ENGINE_LINE}</p>
      </footer>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      data-platform-surface={surface}
    >
      {withLogo ? (
        <Image
          src={PLATFORM_LOGO_SRC}
          alt=""
          width={72}
          height={20}
          className="h-4 w-auto opacity-80"
          unoptimized
        />
      ) : null}
      <span className="text-[11px] font-medium tracking-wide text-slate-400">{line}</span>
    </div>
  );
}
