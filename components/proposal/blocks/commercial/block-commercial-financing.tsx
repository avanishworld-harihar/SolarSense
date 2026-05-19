"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import { buildCommercialEmiTable, selectedCommercialEmi } from "@/lib/commercial-financing";
import { BlockPanel, BlockSectionTitle, BlockStatTile } from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "darkMode" | "commercialConfig">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockCommercialFinancing({ summary, lang, darkMode, commercialConfig }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;
  const cfg = commercialConfig?.financing;
  if (cfg?.enabled === false) return null;

  const netCost = summary.netCost;
  const table = buildCommercialEmiTable(netCost, cfg);
  const highlight = selectedCommercialEmi(netCost, cfg);
  const lender = cfg?.lenderLabel?.trim() || (isHi ? "वित्तीय भागीदार" : "Financing partner");

  return (
    <ProposalJourneySection id="commercial-financing">
      <BlockSectionTitle
        kicker={isHi ? "वित्तपोषण" : "Financing"}
        title={isHi ? "वाणिज्यिक ऋण / EMI विकल्प" : "Commercial Loan & EMI Options"}
        subtitle={
          isHi
            ? `${lender} — लचीली अवधि, तेज़ मंजूरी`
            : `${lender} — flexible tenure, fast approval for C&I solar`
        }
        dark={dark}
        lang={lang}
      />

      {highlight && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BlockStatTile
            label={isHi ? "मासिक EMI" : "Monthly EMI"}
            value={inr(highlight.monthlyEmi)}
            rawValue={highlight.monthlyEmi}
            tone="green"
            dark={dark}
            lang={lang}
          />
          <BlockStatTile
            label={isHi ? "अवधि" : "Tenure"}
            value={`${highlight.tenureYears} ${isHi ? "वर्ष" : "yr"}`}
            tone="blue"
            dark={dark}
            lang={lang}
          />
          <BlockStatTile
            label={isHi ? "कुल ब्याज" : "Total interest"}
            value={inr(highlight.totalInterest)}
            rawValue={highlight.totalInterest}
            tone="amber"
            dark={dark}
            lang={lang}
          />
        </div>
      )}

      <BlockPanel dark={dark}>
        <div className="mb-3 flex items-center gap-2">
          <Landmark className={`h-4 w-4 ${dark ? "text-sky-400" : "text-sky-600"}`} />
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "अवधि तुलना" : "Tenure comparison"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className={dark ? "text-slate-400" : "text-slate-500"}>
                <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">
                  {isHi ? "अवधि" : "Tenure"}
                </th>
                <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">
                  EMI
                </th>
                <th className="pb-2 text-[10px] font-semibold uppercase tracking-wider">
                  {isHi ? "कुल देय" : "Total payable"}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const isSel = highlight?.tenureYears === row.tenureYears;
                return (
                  <motion.tr
                    key={row.tenureYears}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className={
                      isSel
                        ? dark
                          ? "bg-sky-950/40 font-semibold text-white"
                          : "bg-sky-50 font-semibold text-slate-900"
                        : dark
                        ? "text-slate-300"
                        : "text-slate-700"
                    }
                  >
                    <td className="py-2 pr-4">{row.tenureYears} {isHi ? "वर्ष" : "yr"}</td>
                    <td className="py-2 pr-4 tabular-nums">{inr(row.monthlyEmi)}</td>
                    <td className="py-2 tabular-nums">{inr(row.totalPayable)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(cfg?.downPaymentInr ?? 0) > 0 && (
          <p className={`mt-3 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "डाउन पेमेंट" : "Down payment"}: {inr(cfg!.downPaymentInr!)} ·{" "}
            {isHi ? "ऋण राशि" : "Loan amount"}: {inr(netCost - (cfg?.downPaymentInr ?? 0))}
          </p>
        )}
      </BlockPanel>
    </ProposalJourneySection>
  );
}
