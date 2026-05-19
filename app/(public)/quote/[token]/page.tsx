import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuotationByToken } from "@/lib/quotations-store";
import { QuotationPublicView } from "@/components/quotation/quotation-public-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const q = await getQuotationByToken(token);
  if (!q) return { title: "Solar Quotation" };
  return {
    title: `${q.customer_name} — Solar Quotation`,
    description: q.final_amount_inr
      ? `Net payable: ₹${Math.round(q.final_amount_inr).toLocaleString("en-IN")} · ${q.system_kw ?? ""} kW solar system`
      : "Your personalised solar quotation.",
  };
}

export default async function QuotationPublicPage({ params }: PageProps) {
  const { token } = await params;
  const quotation = await getQuotationByToken(token);
  if (!quotation) notFound();

  return <QuotationPublicView quotation={quotation} />;
}
