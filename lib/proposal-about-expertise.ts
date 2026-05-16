import type { ProposalLang } from "@/lib/proposal-i18n";

export type ExpertiseCardCopy = {
  title: string;
  subtitle: string;
  bullets: string[];
  color: "sky" | "violet" | "amber";
};

export function solutionsForEveryScale(lang: ProposalLang): { title: string; subtitle: string } {
  return lang === "hi"
    ? {
        title: "हर पैमाने के लिए समाधान",
        subtitle:
          "घर की छत से लेकर औद्योगिक मेगावॉट तक — हम आपके लिए सही सिस्टम डिज़ाइन और इंस्टॉल करते हैं।"
      }
    : {
        title: "Solutions for Every Scale",
        subtitle: "From home rooftops to industrial megawatts — we engineer the right system for you."
      };
}

export function expertiseCategoriesCopy(lang: ProposalLang): ExpertiseCardCopy[] {
  if (lang === "hi") {
    return [
      {
        title: "आवासीय सोलर",
        subtitle: "घर और अपार्टमेंट",
        bullets: [
          "1–10 kW रूफटॉप सिस्टम",
          "PM सूर्य घर सब्सिडी के योग्य",
          "25-वर्षीय प्रदर्शन वारंटी"
        ],
        color: "sky"
      },
      {
        title: "वाणिज्यिक सोलर",
        subtitle: "दुकानें और कार्यालय",
        bullets: [
          "10–100 kW ऑन-ग्रिड सिस्टम",
          "त्वरित मूल्यह्रास लाभ",
          "नेट मीटरिंग + निर्यात आय"
        ],
        color: "violet"
      },
      {
        title: "औद्योगिक सोलर",
        subtitle: "कारखाने और संयंत्र",
        bullets: [
          "100 kW+ ग्राउंड/रूफटॉप",
          "HT / LT कनेक्शन समाधान",
          "कस्टम ऊर्जा ऑडिट + BOM"
        ],
        color: "amber"
      }
    ];
  }
  return [
    {
      title: "Residential Solar",
      subtitle: "Homes & Apartments",
      bullets: ["1–10 kW rooftop systems", "PM Surya Ghar subsidy eligible", "25-year performance warranty"],
      color: "sky"
    },
    {
      title: "Commercial Solar",
      subtitle: "Shops & Offices",
      bullets: ["10–100 kW on-grid systems", "Accelerated depreciation benefits", "Net metering + export income"],
      color: "violet"
    },
    {
      title: "Industrial Solar",
      subtitle: "Factories & Plants",
      bullets: ["100 kW+ ground/rooftop", "HT / LT connection solutions", "Custom energy audit + BOM"],
      color: "amber"
    }
  ];
}

export function whyCustomersChooseUsTitle(lang: ProposalLang): string {
  return lang === "hi" ? "ग्राहक हमें क्यों चुनते हैं" : "Why customers choose us";
}
