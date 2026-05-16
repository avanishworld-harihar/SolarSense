import type { Metadata } from "next";
import { HariharSolarCalculatorClient } from "@/components/acquisition/harihar/harihar-solar-calculator-client";

export const metadata: Metadata = {
  title: "Harihar Solar — Solar Savings Calculator",
  description:
    "Estimate system size, savings, subsidy, and payback for your home. Powered by SOL.52. Harihar Solar, Satna & Madhya Pradesh.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Harihar Solar — Solar Savings Calculator",
    description: "Homeowner solar estimate in seconds. Powered by SOL.52."
  }
};

export default function HariharSolarCalculatorPage() {
  return <HariharSolarCalculatorClient />;
}
