/**
 * Sol.52 — proposal i18n dictionary (EN/HI).
 *
 * Used by both the PPT renderer and the public web proposal view so a
 * single switch toggles the entire document between English and Hindi.
 *
 * Keys are STABLE — please do not rename without updating the renderers.
 */

export type ProposalLang = "en" | "hi";

export type ProposalDict = {
  // Brand-agnostic labels.
  "common.solarProposal": string;
  "common.personalised": string;
  "common.preparedFor": string;
  "common.preparedBy": string;
  "common.system": string;
  "common.panels": string;
  "common.netCost": string;
  "common.payback": string;
  "common.annualSaving": string;
  "common.lifeProfit": string;
  "common.billReduction": string;
  "common.engineNote": string;
  "common.thankYou": string;
  "common.continued": string;
  "common.page": string;

  // Slide titles.
  "slide.cover.kicker": string;
  "slide.audit.kicker": string;
  "slide.audit.title": string;
  "slide.audit.subtitle": string;
  "slide.economics.kicker": string;
  "slide.economics.title": string;
  "slide.economics.subtitle": string;
  "slide.environment.kicker": string;
  "slide.environment.title": string;
  "slide.environment.subtitle": string;
  "slide.about.kicker": string;
  "slide.about.title": string;
  "slide.technical.kicker": string;
  "slide.technical.title": string;
  "slide.bom.kicker": string;
  "slide.bom.title": string;
  "slide.payment.kicker": string;
  "slide.payment.title": string;
  "slide.commercial.kicker": string;
  "slide.commercial.title": string;
  "slide.amc.kicker": string;
  "slide.amc.title": string;
  "slide.banking.kicker": string;
  "slide.banking.title": string;
  "slide.closing.kicker": string;
  "slide.closing.title": string;

  // Customer profile.
  "profile.consumerId": string;
  "profile.meterNo": string;
  "profile.connectionDate": string;
  "profile.connectionType": string;
  "profile.phase": string;
  "profile.sanctionedLoad": string;

  // Audit table column headers.
  "audit.month": string;
  "audit.units": string;
  "audit.energy": string;
  "audit.fixed": string;
  "audit.dutyFuel": string;
  "audit.netBill": string;
  "audit.total": string;

  // Insight cards.
  "insight.summer.title": string;
  "insight.summer.sub": string;
  "insight.fixed.title": string;
  "insight.fixed.sub": string;
  "insight.duty.title": string;
  "insight.duty.sub": string;
  "insight.solar.title": string;
  "insight.solar.sub": string;

  // Generation vs usage.
  "gen.title": string;
  "gen.daily": string;
  "gen.annualGen": string;
  "gen.annualUse": string;
  "gen.coverage": string;
  "gen.surplus": string;

  // Finance / EMI.
  "emi.title": string;
  "emi.subtitle": string;
  "emi.tenure": string;
  "emi.monthlyEmi": string;
  "emi.totalInterest": string;
  "emi.totalPayable": string;
  "emi.years": string;
  "emi.rate": string;
  "emi.principal": string;
  "emi.financeCta": string;

  // Environment.
  "env.co2": string;
  "env.trees": string;
  "env.solarYearly": string;
  "env.coverage": string;
  "env.legacy.title": string;
  "env.legacy.sub": string;

  // About / company profile.
  "about.aboutUs": string;
  "about.founded": string;
  "about.gst": string;
  "about.locations": string;
  "about.installations": string;
  "about.warrantyClaim": string;

  // Technical.
  "tech.scheme": string;
  "tech.gridType": string;
  "tech.panelTech": string;
  "tech.mounting": string;
  "tech.architecture": string;
  "tech.projectPlan": string;

  // BOM.
  "bom.component": string;
  "bom.spec": string;
  "bom.brand": string;
  "bom.qty": string;
  "bom.warranty": string;

  // Payment terms.
  "pay.advance": string;
  "pay.material": string;
  "pay.installation": string;
  "pay.commissioning": string;

  // Commercial.
  "commercial.gross": string;
  "commercial.subsidy": string;
  "commercial.net": string;
  "commercial.gst": string;
  "commercial.amc": string;
  "commercial.timeline": string;

  // AMC service plan.
  "amc.included": string;
  "amc.excluded": string;
  "amc.response": string;
  "amc.escalation": string;
  "amc.option": string;
  "amc.year": string;
  "amc.years": string;

  // Banking.
  "bank.accountName": string;
  "bank.accountNumber": string;
  "bank.ifsc": string;
  "bank.branch": string;
  "bank.upiId": string;
  "bank.scanQr": string;

  // CTAs.
  "cta.whatsapp": string;
  "cta.downloadPpt": string;
  "cta.callUs": string;
  "cta.share": string;
  "cta.toggleLang": string;
};

const EN: ProposalDict = {
  "common.solarProposal": "Solar Proposal",
  "common.personalised": "Personalised Solar Proposal",
  "common.preparedFor": "Prepared for",
  "common.preparedBy": "Prepared by",
  "common.system": "System",
  "common.panels": "Panels",
  "common.netCost": "Net Post-Subsidy Cost",
  "common.payback": "Payback",
  "common.annualSaving": "Annual Saving",
  "common.lifeProfit": "25-Year Profit",
  "common.billReduction": "Bill Reduction",
  "common.engineNote": "Numbers verified by FY 2025-26 MPERC tariff engine",
  "common.thankYou": "Thank You",
  "common.continued": "continued",
  "common.page": "Page",

  "slide.cover.kicker": "Personalised Solar Proposal",
  "slide.audit.kicker": "Bill Intelligence",
  "slide.audit.title": "Your Electricity Bill — A Deep Audit",
  "slide.audit.subtitle": "Month-by-month breakdown · MPERC FY 2025-26 verified",
  "slide.economics.kicker": "Generation vs Usage",
  "slide.economics.title": "How Your Solar Will Pay Itself Off",
  "slide.economics.subtitle": "EMI options, lifetime savings & break-even point",
  "slide.environment.kicker": "Your Green Legacy",
  "slide.environment.title": "Carbon You'll Save Forever",
  "slide.environment.subtitle": "25-year environmental impact of your rooftop",
  "slide.about.kicker": "About Us",
  "slide.about.title": "Why Customers Trust Harihar Solar",
  "slide.technical.kicker": "Technical Proposal",
  "slide.technical.title": "System Architecture & Project Scheme",
  "slide.bom.kicker": "Bill of Material",
  "slide.bom.title": "Tier-1 Components, Honest Specs",
  "slide.payment.kicker": "Payment Plan",
  "slide.payment.title": "How You Will Pay (25 / 50 / 20 / 5)",
  "slide.commercial.kicker": "Commercial Terms",
  "slide.commercial.title": "Total Cost, Subsidies & Timeline",
  "slide.amc.kicker": "Service & AMC",
  "slide.amc.title": "Aftercare You Can Count On",
  "slide.banking.kicker": "Banking & Payments",
  "slide.banking.title": "Pay Securely — Bank or UPI",
  "slide.closing.kicker": "Thank You",
  "slide.closing.title": "Welcome to a Brighter Future",

  "profile.consumerId": "Consumer ID",
  "profile.meterNo": "Meter No.",
  "profile.connectionDate": "Connection Date",
  "profile.connectionType": "Type",
  "profile.phase": "Phase",
  "profile.sanctionedLoad": "Sanctioned Load",

  "audit.month": "Month",
  "audit.units": "Units",
  "audit.energy": "Energy ₹",
  "audit.fixed": "Fixed ₹",
  "audit.dutyFuel": "Duty + Fuel ₹",
  "audit.netBill": "Net Bill ₹",
  "audit.total": "Total",

  "insight.summer.title": "Summer Bill Trap",
  "insight.summer.sub": "Annual bill share Apr-Jul",
  "insight.fixed.title": "Fixed Charge Reality",
  "insight.fixed.sub": "Use or not — you still pay",
  "insight.duty.title": "Duty + FPPAS",
  "insight.duty.sub": "Just tax & fuel adjustment",
  "insight.solar.title": "Solar Saving",
  "insight.solar.sub": "After your rooftop is live",

  "gen.title": "Generation vs Usage",
  "gen.daily": "Daily Generation",
  "gen.annualGen": "Annual Generation",
  "gen.annualUse": "Annual Usage",
  "gen.coverage": "Coverage",
  "gen.surplus": "Surplus exported to grid",

  "emi.title": "Buy with EMI",
  "emi.subtitle": "Net cost financed at preferred bank rate",
  "emi.tenure": "Tenure",
  "emi.monthlyEmi": "Monthly EMI",
  "emi.totalInterest": "Total Interest",
  "emi.totalPayable": "Total Payable",
  "emi.years": "yr",
  "emi.rate": "Rate",
  "emi.principal": "Principal",
  "emi.financeCta": "Ask us about Solar Loan",

  "env.co2": "CO₂ Saved",
  "env.trees": "Trees Equivalent",
  "env.solarYearly": "Clean Energy / yr",
  "env.coverage": "Demand Coverage",
  "env.legacy.title": "Your Green Legacy",
  "env.legacy.sub": "What your rooftop gives back to the planet over 25 years.",

  "about.aboutUs": "About Us",
  "about.founded": "Founded",
  "about.gst": "GST",
  "about.locations": "Service Areas",
  "about.installations": "Installations Done",
  "about.warrantyClaim": "Warranty Claim Support",

  "tech.scheme": "Project Scheme",
  "tech.gridType": "Grid Type",
  "tech.panelTech": "Panel Technology",
  "tech.mounting": "Mounting",
  "tech.architecture": "System Architecture",
  "tech.projectPlan": "Project Plan",

  "bom.component": "Component",
  "bom.spec": "Specification",
  "bom.brand": "Brand",
  "bom.qty": "Qty",
  "bom.warranty": "Warranty",

  "pay.advance": "Advance against PO",
  "pay.material": "After Material Dispatch",
  "pay.installation": "On Installation",
  "pay.commissioning": "Against Commissioning",

  "commercial.gross": "Gross System Cost",
  "commercial.subsidy": "PM Surya Ghar Subsidy",
  "commercial.net": "Net Customer Pays",
  "commercial.gst": "Including 13.8% GST",
  "commercial.amc": "AMC after Year 1",
  "commercial.timeline": "Project Timeline",

  "amc.included": "What's Included",
  "amc.excluded": "Customer Scope",
  "amc.response": "Response Time",
  "amc.escalation": "Escalation Matrix",
  "amc.option": "AMC Option",
  "amc.year": "year",
  "amc.years": "years",

  "bank.accountName": "Account Name",
  "bank.accountNumber": "Account No.",
  "bank.ifsc": "IFSC",
  "bank.branch": "Branch",
  "bank.upiId": "UPI ID",
  "bank.scanQr": "Scan to pay via UPI",

  "cta.whatsapp": "WhatsApp Share",
  "cta.downloadPpt": "Download PPT",
  "cta.callUs": "Call Us",
  "cta.share": "Share",
  "cta.toggleLang": "हिन्दी"
};

const HI: ProposalDict = {
  "common.solarProposal": "सोलर प्रस्ताव",
  "common.personalised": "व्यक्तिगत सोलर प्रस्ताव",
  "common.preparedFor": "तैयार किया गया",
  "common.preparedBy": "तैयार करने वाले",
  "common.system": "सिस्टम",
  "common.panels": "पैनल",
  "common.netCost": "सब्सिडी के बाद कीमत",
  "common.payback": "पेबैक",
  "common.annualSaving": "वार्षिक बचत",
  "common.lifeProfit": "25-वर्ष का मुनाफा",
  "common.billReduction": "बिल में कमी",
  "common.engineNote": "FY 2025-26 MPERC टैरिफ इंजन से सत्यापित",
  "common.thankYou": "धन्यवाद",
  "common.continued": "जारी",
  "common.page": "पृष्ठ",

  "slide.cover.kicker": "व्यक्तिगत सोलर प्रस्ताव",
  "slide.audit.kicker": "बिल विश्लेषण",
  "slide.audit.title": "आपका बिजली बिल — गहन ऑडिट",
  "slide.audit.subtitle": "मासिक विश्लेषण · MPERC FY 2025-26 से सत्यापित",
  "slide.economics.kicker": "उत्पादन बनाम खपत",
  "slide.economics.title": "आपका सोलर खुद की कीमत कैसे चुकाएगा",
  "slide.economics.subtitle": "EMI विकल्प, आजीवन बचत और ब्रेक-ईवन बिंदु",
  "slide.environment.kicker": "आपकी हरित विरासत",
  "slide.environment.title": "आपके द्वारा बचाया जाने वाला कार्बन",
  "slide.environment.subtitle": "आपकी छत का 25-वर्षीय पर्यावरणीय प्रभाव",
  "slide.about.kicker": "हमारे बारे में",
  "slide.about.title": "ग्राहक हरिहर सोलर पर भरोसा क्यों करते हैं",
  "slide.technical.kicker": "तकनीकी प्रस्ताव",
  "slide.technical.title": "सिस्टम आर्किटेक्चर एवं परियोजना योजना",
  "slide.bom.kicker": "उपकरण सूची",
  "slide.bom.title": "टियर-1 कंपोनेंट्स, ईमानदार स्पेसिफिकेशन",
  "slide.payment.kicker": "भुगतान योजना",
  "slide.payment.title": "आप भुगतान कैसे करेंगे (25 / 50 / 20 / 5)",
  "slide.commercial.kicker": "वाणिज्यिक शर्तें",
  "slide.commercial.title": "कुल लागत, सब्सिडी और समय-सीमा",
  "slide.amc.kicker": "सेवा एवं AMC",
  "slide.amc.title": "विश्वसनीय आफ्टरकेयर",
  "slide.banking.kicker": "बैंकिंग एवं भुगतान",
  "slide.banking.title": "सुरक्षित भुगतान — बैंक या UPI",
  "slide.closing.kicker": "धन्यवाद",
  "slide.closing.title": "उज्ज्वल भविष्य में आपका स्वागत है",

  "profile.consumerId": "उपभोक्ता ID",
  "profile.meterNo": "मीटर नं.",
  "profile.connectionDate": "कनेक्शन तारीख",
  "profile.connectionType": "प्रकार",
  "profile.phase": "फेज",
  "profile.sanctionedLoad": "स्वीकृत लोड",

  "audit.month": "महीना",
  "audit.units": "यूनिट",
  "audit.energy": "ऊर्जा ₹",
  "audit.fixed": "फिक्स्ड ₹",
  "audit.dutyFuel": "ड्यूटी+फ्यूल ₹",
  "audit.netBill": "नेट बिल ₹",
  "audit.total": "कुल",

  "insight.summer.title": "गर्मी का बिल जाल",
  "insight.summer.sub": "अप्रैल-जुलाई में सालाना बिल का हिस्सा",
  "insight.fixed.title": "फिक्स्ड चार्ज की सच्चाई",
  "insight.fixed.sub": "बिजली इस्तेमाल करें या नहीं — देना पड़ेगा",
  "insight.duty.title": "ड्यूटी + FPPAS",
  "insight.duty.sub": "केवल टैक्स और ईंधन समायोजन",
  "insight.solar.title": "सोलर बचत",
  "insight.solar.sub": "छत पर सोलर लगने के बाद",

  "gen.title": "उत्पादन बनाम खपत",
  "gen.daily": "दैनिक उत्पादन",
  "gen.annualGen": "वार्षिक उत्पादन",
  "gen.annualUse": "वार्षिक खपत",
  "gen.coverage": "कवरेज",
  "gen.surplus": "ग्रिड को निर्यात",

  "emi.title": "EMI पर खरीदें",
  "emi.subtitle": "नेट कीमत बैंक की पसंदीदा दर पर वित्तपोषित",
  "emi.tenure": "अवधि",
  "emi.monthlyEmi": "मासिक EMI",
  "emi.totalInterest": "कुल ब्याज",
  "emi.totalPayable": "कुल देय",
  "emi.years": "वर्ष",
  "emi.rate": "दर",
  "emi.principal": "मूलधन",
  "emi.financeCta": "सोलर लोन के बारे में पूछें",

  "env.co2": "CO₂ की बचत",
  "env.trees": "पेड़ों के बराबर",
  "env.solarYearly": "स्वच्छ ऊर्जा / वर्ष",
  "env.coverage": "मांग कवरेज",
  "env.legacy.title": "आपकी हरित विरासत",
  "env.legacy.sub": "25 वर्षों में आपकी छत द्वारा पृथ्वी को मिलने वाला योगदान।",

  "about.aboutUs": "हमारे बारे में",
  "about.founded": "स्थापना",
  "about.gst": "GST",
  "about.locations": "सेवा क्षेत्र",
  "about.installations": "स्थापित परियोजनाएं",
  "about.warrantyClaim": "वारंटी क्लेम सहायता",

  "tech.scheme": "प्रोजेक्ट स्कीम",
  "tech.gridType": "ग्रिड टाइप",
  "tech.panelTech": "पैनल तकनीक",
  "tech.mounting": "माउंटिंग",
  "tech.architecture": "सिस्टम आर्किटेक्चर",
  "tech.projectPlan": "परियोजना योजना",

  "bom.component": "कंपोनेंट",
  "bom.spec": "स्पेसिफिकेशन",
  "bom.brand": "ब्रांड",
  "bom.qty": "मात्रा",
  "bom.warranty": "वारंटी",

  "pay.advance": "PO के साथ अग्रिम",
  "pay.material": "मटेरियल डिस्पैच के बाद",
  "pay.installation": "इंस्टॉलेशन पर",
  "pay.commissioning": "कमीशनिंग पर",

  "commercial.gross": "सकल सिस्टम लागत",
  "commercial.subsidy": "PM सूर्य घर सब्सिडी",
  "commercial.net": "ग्राहक का भुगतान",
  "commercial.gst": "13.8% GST सहित",
  "commercial.amc": "पहले वर्ष के बाद AMC",
  "commercial.timeline": "परियोजना समय-सीमा",

  "amc.included": "क्या-क्या शामिल है",
  "amc.excluded": "ग्राहक का दायरा",
  "amc.response": "प्रतिक्रिया समय",
  "amc.escalation": "एस्केलेशन मैट्रिक्स",
  "amc.option": "AMC विकल्प",
  "amc.year": "वर्ष",
  "amc.years": "वर्ष",

  "bank.accountName": "खाताधारक",
  "bank.accountNumber": "खाता नं.",
  "bank.ifsc": "IFSC",
  "bank.branch": "शाखा",
  "bank.upiId": "UPI ID",
  "bank.scanQr": "UPI से भुगतान के लिए QR स्कैन करें",

  "cta.whatsapp": "WhatsApp शेयर",
  "cta.downloadPpt": "PPT डाउनलोड",
  "cta.callUs": "कॉल करें",
  "cta.share": "शेयर",
  "cta.toggleLang": "English"
};

const DICTS: Record<ProposalLang, ProposalDict> = { en: EN, hi: HI };

export function dict(lang: ProposalLang | undefined): ProposalDict {
  return DICTS[lang ?? "en"];
}

export function tt(lang: ProposalLang | undefined, key: keyof ProposalDict): string {
  return dict(lang)[key] ?? EN[key];
}

export function monthLabels(lang: ProposalLang | undefined): string[] {
  return lang === "hi"
    ? ["जन", "फर", "मार्च", "अप्र", "मई", "जून", "जुल", "अग", "सित", "अक्ट", "नव", "दिस"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}
