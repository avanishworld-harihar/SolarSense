"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { PROPOSAL_BRANDING_UPDATED_EVENT, readProposalBrandingSettings } from "@/lib/proposal-branding-settings";
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
  const [installerLogoUrl, setInstallerLogoUrl] = useState("");
  const [installerName, setInstallerName] = useState("");

  useEffect(() => {
    const sync = () => {
      const s = readProposalBrandingSettings();
      setInstallerLogoUrl(s.installerLogoUrl?.trim() ?? "");
      setInstallerName(s.installerName?.trim() ?? "");
    };
    sync();
    window.addEventListener(PROPOSAL_BRANDING_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PROPOSAL_BRANDING_UPDATED_EVENT, sync);
  }, []);

  const inner = (
    <div className={cn(LOGO_BOX, "bg-transparent", className)}>
      {installerLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={installerLogoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-left"
          {...(href ? { "aria-hidden": true } : {})}
        />
      ) : (
        <Logo className="absolute inset-0 h-full w-full" decorative={!!href} />
      )}
    </div>
  );

  const homeLabel = installerLogoUrl && installerName ? `${installerName} home` : `${APP_DISPLAY_NAME} home`;

  if (href) {
    return (
      <Link
        href={href}
        className="flex shrink-0 items-center rounded-md bg-transparent outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500/80"
        aria-label={homeLabel}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
