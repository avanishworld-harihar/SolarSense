import { Noto_Sans_Devanagari } from "next/font/google";
import type { ReactNode } from "react";

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-deva",
  display: "swap"
});

/**
 * Public proposal routes load Noto Sans Devanagari so Hindi mode reads
 * clearly without faux “letter-spaced Devanagari” artifacts.
 */
export default function ProposalRouteLayout({ children }: { children: ReactNode }) {
  return <div className={notoDeva.variable}>{children}</div>;
}
