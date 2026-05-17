import { Noto_Sans_Devanagari } from "next/font/google";
import type { ReactNode } from "react";

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-deva",
  display: "swap"
});

const PROPOSAL_THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("ss_proposal_web_theme_v1");var d=t!=="light";var r=document.documentElement;r.dataset.proposalTheme=d?"dark":"light";var el=document.getElementById("proposal-route-root");if(el){el.style.backgroundColor=d?"#030712":"#f8fafc";el.style.color=d?"#e2e8f0":"#0f172a";}}catch(e){document.documentElement.dataset.proposalTheme="dark";}})();`;

/**
 * Public proposal routes load Noto Sans Devanagari so Hindi mode reads clearly.
 * Dark canvas + inline bootstrap avoid a white flash before React hydrates.
 */
export default function ProposalRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="proposal-route-root"
      className={`${notoDeva.variable} min-h-[100dvh] bg-[#030712] text-slate-200 transition-colors duration-300`}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: PROPOSAL_THEME_BOOTSTRAP }} />
      {children}
    </div>
  );
}
