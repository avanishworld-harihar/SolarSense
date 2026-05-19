/**
 * SOL.52 — Proposal Story Copy (Wave 1 P4 / Wave 3 P6)
 *
 * Hindi-first narrative copy for the Commercial Executive preset.
 * Six customer segments × four story modes = 24 narrative variants.
 *
 * Segments: hotel, hospital, factory, warehouse, dairy, school
 *
 * Story modes:
 *   executive_pitch     — board / owner narrative (high-impact, ROI lead)
 *   cfo_brief           — finance-first narrative (numbers, IRR, payback, cashflow)
 *   operations_brief    — operations / facility manager narrative (reliability, downtime)
 *   sustainability_story — ESG / green narrative (carbon, net-zero, reputation)
 *
 * Usage (future Wave 3):
 *   import { getStoryCopy } from "@/lib/proposal-story-copy";
 *   const copy = getStoryCopy("hotel", "executive_pitch", "hi");
 *   // copy.headline, copy.opening, copy.roi_hook, copy.closing
 *
 * Design principles:
 *   - Hindi is the primary/default script for commercial solar in tier-2/3 India.
 *   - English copy is provided for reference and fallback.
 *   - Numbers are placeholders using {kw}, {savings_annual}, {payback_years}, {net_cost}.
 *   - No marketplace dependencies — purely narrative text.
 *   - Keys are stable — do not rename without updating the web renderer.
 */

export type StorySegment =
  | "hotel"
  | "hospital"
  | "factory"
  | "warehouse"
  | "dairy"
  | "school";

export type StoryMode =
  | "executive_pitch"
  | "cfo_brief"
  | "operations_brief"
  | "sustainability_story";

export type StoryCopy = {
  /** Short punchy headline — used in cover + executive summary */
  headline: string;
  /** Opening paragraph — sets the stage for why solar now */
  opening: string;
  /** ROI hook sentence — single compelling financial fact */
  roi_hook: string;
  /** Closing call-to-action sentence */
  closing: string;
};

export type StoryLang = "hi" | "en";

// ─── Hindi copy ───────────────────────────────────────────────────────────────

const HI_COPY: Record<StorySegment, Record<StoryMode, StoryCopy>> = {
  hotel: {
    executive_pitch: {
      headline: "बिजली खर्च ज़ीरो — मुनाफ़ा दोगुना",
      opening:
        "होटल इंडस्ट्री में बिजली की लागत मुनाफ़े की सबसे बड़ी दुश्मन है। {kw} kW सोलर सिस्टम से हर महीने ₹{savings_annual} की सीधी बचत होगी — बिना किसी ऑपरेशनल बदलाव के।",
      roi_hook:
        "मात्र {payback_years} साल में पूरा निवेश वापस — उसके बाद 20 साल शुद्ध मुनाफ़ा।",
      closing:
        "अभी साइन करें और अगले 60 दिनों में सिस्टम चालू — गेस्ट को प्रीमियम ग्रीन एक्सपीरियंस दें।",
    },
    cfo_brief: {
      headline: "IRR 28% — 4.2 साल पेबैक",
      opening:
        "{kw} kW सोलर का वित्तीय मॉडल: नेट लागत ₹{net_cost}, सालाना बचत ₹{savings_annual}, IRR लगभग 28%, पेबैक {payback_years} साल। 25 साल का कुल सरप्लस ₹{surplus_lifetime} से अधिक।",
      roi_hook:
        "बैंक FD से 3× ज़्यादा रिटर्न — और टैक्स में 80% एक्सेलरेटेड डेप्रिसिएशन का लाभ।",
      closing:
        "Q1 में CapEx अप्रूव करें — subsidy विंडो बंद होने से पहले बुकिंग ज़रूरी।",
    },
    operations_brief: {
      headline: "24×7 रिलायबल पावर — ग्रिड डिपेंडेंसी खत्म",
      opening:
        "होटल में पावर कट का मतलब है गेस्ट कंप्लेंट, HVAC फेल, और रेपुटेशन नुकसान। {kw} kW सोलर + बैकअप कॉन्फिग से पीक आवर्स में 100% ऑटोनॉमी।",
      roi_hook:
        "जेनरेटर का डीज़ल खर्च ₹{diesel_savings}/माह कम — सोलर से मिलने वाली बचत के ऊपर।",
      closing:
        "3-हफ्ते में इंस्टॉलेशन पूरी — किसी ऑपरेशन में बाधा नहीं।",
    },
    sustainability_story: {
      headline: "ग्रीन होटल — ग्रीन रेवेन्यू",
      opening:
        "{kw} kW सोलर से हर साल लगभग {carbon_tons} टन CO₂ कम होगी — एक बड़े जंगल जितना। आज के ट्रैवलर ग्रीन स्टे को प्राथमिकता देते हैं।",
      roi_hook:
        "TripAdvisor, MakeMyTrip पर 'Green Certified' बैज — प्रीमियम रूम रेट जस्टिफाई करने का सबसे आसान तरीका।",
      closing:
        "अपनी CSR रिपोर्ट में सोलर कमिटमेंट जोड़ें — अभी शुरू करें।",
    },
  },

  hospital: {
    executive_pitch: {
      headline: "मरीज़ की जान, बिजली पर निर्भर — सोलर से सुरक्षित",
      opening:
        "अस्पताल में बिजली की निरंतरता जीवन और मृत्यु का सवाल है। {kw} kW सोलर सिस्टम से OT, ICU, और diagnostics के लिए क्लीन बैकअप पावर — साथ में ₹{savings_annual}/साल की बचत।",
      roi_hook:
        "जेनरेटर पर निर्भरता 70% कम — डीज़ल खर्च और maintainance दोनों घटेंगे।",
      closing:
        "NABH/JCI अप्रूव सोलर कॉन्फिग — अस्पताल की credibility और compliance दोनों बढ़ाएँ।",
    },
    cfo_brief: {
      headline: "₹{net_cost} निवेश — {payback_years} साल पेबैक",
      opening:
        "अस्पताल का बिजली बिल सबसे बड़े fixed costs में से एक है। {kw} kW सोलर से सालाना ₹{savings_annual} की सीधी बचत — 25 साल का कुल फ़ायदा ₹{surplus_lifetime} करोड़ तक।",
      roi_hook:
        "Section 32 के तहत 40% एक्सेलरेटेड डेप्रिसिएशन — पहले साल ही टैक्स में बड़ा फ़ायदा।",
      closing:
        "बजट सेशन से पहले अप्रूव करें — subsidy की आखिरी विंडो मिस मत करें।",
    },
    operations_brief: {
      headline: "OT में बिजली कट — कभी नहीं",
      opening:
        "{kw} kW सोलर + हाइब्रिड कॉन्फिग से critical loads के लिए seamless backup। ग्रिड फेल होने पर भी OT, ICU, वेंटिलेटर, और imaging uninterrupted।",
      roi_hook:
        "जेनरेटर स्टार्ट-अप का 30-45 सेकंड गैप खत्म — सोलर से instant switchover।",
      closing:
        "4 हफ्ते में commissioning — operations बाधित नहीं होंगे।",
    },
    sustainability_story: {
      headline: "हेल्दी प्लैनेट, हेल्दी हॉस्पिटल",
      opening:
        "{kw} kW सोलर से {carbon_tons} टन CO₂/साल कम — NABH ग्रीन हेल्थकेयर स्टैंडर्ड का हिस्सा। मरीज़ और स्टाफ दोनों को बेहतर indoor environment।",
      roi_hook:
        "WHO के 'Climate-Smart Healthcare' फ्रेमवर्क में qualify — domestic और international accreditation में एडवांटेज।",
      closing:
        "हरित स्वास्थ्य की ओर पहला कदम — आज साइन करें।",
    },
  },

  factory: {
    executive_pitch: {
      headline: "उत्पादन लागत 30% कम — प्रतिस्पर्धा में आगे",
      opening:
        "मैन्युफैक्चरिंग में बिजली लागत प्रति यूनिट कॉस्ट को सीधे प्रभावित करती है। {kw} kW सोलर से ₹{savings_annual}/साल की बचत — EBITDA सीधे बढ़ेगा।",
      roi_hook:
        "हर यूनिट प्रोडक्शन पर ₹{savings_per_unit} कम लागत — एक्सपोर्ट में competitive edge।",
      closing:
        "Q2 से बिजली बिल में गिरावट शुरू — अभी बुकिंग करें।",
    },
    cfo_brief: {
      headline: "IRR 32% — industrial solar का सबसे मजबूत केस",
      opening:
        "{kw} kW सोलर: नेट ₹{net_cost}, सालाना बचत ₹{savings_annual}, पेबैक {payback_years} साल। Section 32 डेप्रिसिएशन से पहले साल टैक्स में ₹{tax_benefit} का फ़ायदा।",
      roi_hook:
        "बैंक लोन पर भी सोलर cash flow positive Day 1 से — EMI < monthly savings।",
      closing:
        "PLI scheme + solar — manufacturing की double advantage लें।",
    },
    operations_brief: {
      headline: "पावर कट = प्रोडक्शन लॉस — अब नहीं",
      opening:
        "{kw} kW सोलर + grid-tie कॉन्फिग से shift के दौरान stable voltage और frequency। power quality issues से मशीन downtime खत्म।",
      roi_hook:
        "हर घंटे का production downtime ₹{downtime_cost} का नुकसान — solar से यह जोखिम न्यूनतम।",
      closing:
        "3 हफ्ते की zero-downtime installation — shift schedule बाधित नहीं होगा।",
    },
    sustainability_story: {
      headline: "ग्रीन मैन्युफैक्चरिंग — ESG रेटिंग बेहतर",
      opening:
        "{kw} kW सोलर से Scope 2 emissions {carbon_tons} टन/साल कम। EU CBAM, buyer ESG audits, और export compliance के लिए ज़रूरी।",
      roi_hook:
        "Amazon, Walmart, और IKEA जैसे global buyers अब supplier sustainability score चेक करते हैं।",
      closing:
        "GHG inventory में solar जोड़ें — export orders और valuations दोनों बढ़ाएँ।",
    },
  },

  warehouse: {
    executive_pitch: {
      headline: "छत बड़ी है — बिजली बिल क्यों?",
      opening:
        "वेयरहाउस की बड़ी छत सबसे बड़ी सोलर asset है। {kw} kW सिस्टम से ₹{savings_annual}/साल की बचत — बिना किसी ऑपरेशनल बदलाव के।",
      roi_hook:
        "प्रति sq ft छत से ₹{savings_per_sqft}/साल अतिरिक्त आमदनी — property को productive बनाएँ।",
      closing:
        "logistics cost में बड़ी कटौती — अभी बुक करें।",
    },
    cfo_brief: {
      headline: "EBITDA में सीधा सुधार — {payback_years} साल में payout",
      opening:
        "नेट लागत ₹{net_cost}, सालाना बचत ₹{savings_annual}। 25 साल का surplus ₹{surplus_lifetime} — warehousing का सबसे बेहतर CapEx।",
      roi_hook:
        "Sale-leaseback structuring + solar tax benefit — balance sheet को optimize करें।",
      closing:
        "FY close से पहले commissioning — इसी साल डेप्रिसिएशन benefit लें।",
    },
    operations_brief: {
      headline: "24×7 cold storage — बिजली कट से राहत",
      opening:
        "{kw} kW solar से cold storage और conveyor के लिए reliable power। peak demand charges भी कम — DG backup की ज़रूरत घटेगी।",
      roi_hook:
        "Cold chain में एक भी power failure = inventory loss + customer penalty। solar से यह risk eliminate।",
      closing:
        "weekend/offday installation — operations में कोई बाधा नहीं।",
    },
    sustainability_story: {
      headline: "ग्रीन लॉजिस्टिक्स — Scope 3 compliant",
      opening:
        "{kw} kW solar से {carbon_tons} टन CO₂/साल कम — e-commerce और FMCG clients की ESG supply chain में qualify करें।",
      roi_hook:
        "Flipkart, Amazon Seller Central: Green Warehouse badge = priority listing और बेहतर SLA।",
      closing:
        "Sustainability report में warehouse solar जोड़ें — client retention और नए contracts बढ़ाएँ।",
    },
  },

  dairy: {
    executive_pitch: {
      headline: "दूध ठंडा रखें, मुनाफ़ा गर्म रखें",
      opening:
        "डेयरी में cold storage, chilling, और pasteurization का बिजली खर्च सबसे बड़ा operational burden है। {kw} kW solar से ₹{savings_annual}/साल की सीधी बचत।",
      roi_hook:
        "₹{savings_per_litre} प्रति लीटर production cost कम — market में competitive बनें।",
      closing:
        "NDDB/Amul supply chain standards के अनुरूप solar कॉन्फिग — अभी शुरू करें।",
    },
    cfo_brief: {
      headline: "पेबैक {payback_years} साल — 25 साल का शुद्ध फ़ायदा",
      opening:
        "नेट ₹{net_cost}, सालाना ₹{savings_annual}। DSCR 1.8× — bank financing आसानी से मिलेगी। डेप्रिसिएशन benefit से पहले साल tax में बड़ी राहत।",
      roi_hook:
        "NABARD subsidy + state scheme = effective लागत 30-40% कम।",
      closing:
        "cooperative board approval से पहले cost model share करें — हम डेटा तैयार करेंगे।",
    },
    operations_brief: {
      headline: "chilling failure = batch loss — solar से ज़ीरो downtime",
      opening:
        "{kw} kW solar + hybrid कॉन्फिग से pasteurizer, chiller, और packaging lines के लिए seamless power। peak demand charge 40% तक कम।",
      roi_hook:
        "एक chilling failure = {batch_loss_inr} का batch loss। solar से यह risk eliminate।",
      closing:
        "flush season से पहले install — peak production में तैयार रहें।",
    },
    sustainability_story: {
      headline: "ग्रीन दूध — प्रीमियम ब्रांड",
      opening:
        "{kw} kW solar से carbon-neutral dairy processing। organic और premium dairy segments में solar certification = higher shelf price।",
      roi_hook:
        "Amul, Mother Dairy, और private label buyers अब green dairy को प्राथमिकता देते हैं।",
      closing:
        "FSSAI ग्रीन label और state sustainability award के लिए apply करें — solar पहला कदम है।",
    },
  },

  school: {
    executive_pitch: {
      headline: "शिक्षा का खर्च कम, quality ऊँची",
      opening:
        "स्कूल का बिजली बिल प्रति स्टूडेंट fee को सीधे affect करता है। {kw} kW solar से ₹{savings_annual}/साल की बचत — scholarship fund या infrastructure के लिए उपयोग करें।",
      roi_hook:
        "हर स्टूडेंट पर ₹{savings_per_student}/साल की बचत — fee बढ़ाए बिना quality improve करें।",
      closing:
        "summer vacation में installation — academic session शुरू होने से पहले ready।",
    },
    cfo_brief: {
      headline: "trust corpus से investment — {payback_years} साल में वापस",
      opening:
        "नेट ₹{net_cost}, सालाना ₹{savings_annual}। education institution के लिए Section 32 benefit + GST ITC। 25 साल का surplus ₹{surplus_lifetime}।",
      roi_hook:
        "CBSE/ICSE green school certification: annual audit में solar count होता है।",
      closing:
        "school committee को एक पेज का financial summary — हम तैयार करेंगे।",
    },
    operations_brief: {
      headline: "exam hall में AC हमेशा चालू — बिजली कट नहीं",
      opening:
        "{kw} kW solar से classrooms, labs, और library के लिए stable power। smart meters से real-time consumption monitoring — energy education भी।",
      roi_hook:
        "UPS/generator पर ₹{generator_cost}/महीने का खर्च बचेगा — solar से direct backup।",
      closing:
        "April-May में install — June session के लिए तैयार।",
    },
    sustainability_story: {
      headline: "ग्रीन स्कूल — अगली पीढ़ी को प्रेरणा",
      opening:
        "{kw} kW solar से {carbon_tons} टन CO₂/साल कम। बच्चों को live solar system से energy education — भविष्य के engineers और policy makers।",
      roi_hook:
        "CBSE Green School Award + NEP 2020 sustainability curriculum — solar से दोनों में qualify।",
      closing:
        "Green school का flag लगाएँ — parents, community, और CBSE board — सबको दिखाएँ।",
    },
  },
};

// ─── English copy ─────────────────────────────────────────────────────────────

const EN_COPY: Record<StorySegment, Record<StoryMode, StoryCopy>> = {
  hotel: {
    executive_pitch: {
      headline: "Zero electricity cost — double the profit",
      opening:
        "Electricity is one of the biggest margin killers in hospitality. A {kw} kW solar system saves ₹{savings_annual} every year — with zero operational disruption.",
      roi_hook:
        "Full ROI in {payback_years} years — then 20 years of pure savings.",
      closing:
        "Sign today, go live in 60 days — give guests a premium green experience.",
    },
    cfo_brief: {
      headline: "IRR 28% — 4.2-year payback",
      opening:
        "{kw} kW solar: net cost ₹{net_cost}, annual saving ₹{savings_annual}, IRR ~28%, payback {payback_years} years. 25-year surplus exceeds ₹{surplus_lifetime}.",
      roi_hook:
        "3× better returns than FD — plus 80% accelerated depreciation in Year 1.",
      closing:
        "Approve CapEx in Q1 — book before the subsidy window closes.",
    },
    operations_brief: {
      headline: "24×7 reliable power — end grid dependency",
      opening:
        "Power cuts mean guest complaints, HVAC failure, and reputational damage. {kw} kW solar + backup config gives 100% autonomy during peak hours.",
      roi_hook:
        "Diesel savings of ₹{diesel_savings}/month — on top of solar savings.",
      closing:
        "Installation in 3 weeks — zero disruption to hotel operations.",
    },
    sustainability_story: {
      headline: "Green hotel — green revenue",
      opening:
        "{kw} kW solar reduces {carbon_tons} tonnes of CO₂ annually — equivalent to planting a forest. Today's travellers actively choose green stays.",
      roi_hook:
        "'Green Certified' badge on TripAdvisor and MakeMyTrip — the easiest way to justify premium room rates.",
      closing:
        "Add solar commitment to your CSR report — start today.",
    },
  },
  hospital: {
    executive_pitch: {
      headline: "Patient lives depend on power — solar makes it reliable",
      opening:
        "In a hospital, power continuity is a life-and-death issue. {kw} kW solar provides clean backup for OT, ICU, and diagnostics — plus ₹{savings_annual}/year in savings.",
      roi_hook:
        "70% reduction in generator dependency — lower diesel and maintenance costs.",
      closing:
        "NABH/JCI-approved solar config — improve credibility and compliance simultaneously.",
    },
    cfo_brief: {
      headline: "₹{net_cost} investment — {payback_years}-year payback",
      opening:
        "Electricity is one of the largest fixed costs in healthcare. {kw} kW solar saves ₹{savings_annual}/year — 25-year total benefit up to ₹{surplus_lifetime} crore.",
      roi_hook:
        "Section 32: 40% accelerated depreciation — major tax benefit in Year 1.",
      closing:
        "Approve before budget session — don't miss the subsidy window.",
    },
    operations_brief: {
      headline: "Power cut in OT — never again",
      opening:
        "{kw} kW solar + hybrid config provides seamless backup for critical loads. OT, ICU, ventilators, and imaging remain uninterrupted even on grid failure.",
      roi_hook:
        "Eliminate the 30-45 second generator start-up gap — instant solar switchover.",
      closing:
        "4-week commissioning — no disruption to clinical operations.",
    },
    sustainability_story: {
      headline: "Healthy planet — healthy hospital",
      opening:
        "{kw} kW solar reduces {carbon_tons} tonnes of CO₂/year — part of NABH Green Healthcare standards. Better indoor environment for patients and staff.",
      roi_hook:
        "Qualifies for WHO 'Climate-Smart Healthcare' framework — domestic and international accreditation advantage.",
      closing:
        "First step toward green healthcare — sign today.",
    },
  },
  factory: {
    executive_pitch: {
      headline: "Cut production cost 30% — stay ahead of competition",
      opening:
        "Electricity cost directly impacts per-unit production cost in manufacturing. {kw} kW solar saves ₹{savings_annual}/year — EBITDA improves directly.",
      roi_hook:
        "₹{savings_per_unit} lower cost per unit produced — competitive edge in exports.",
      closing:
        "Bill reduction starts Q2 — book now.",
    },
    cfo_brief: {
      headline: "IRR 32% — the strongest industrial solar case",
      opening:
        "{kw} kW solar: net ₹{net_cost}, annual saving ₹{savings_annual}, payback {payback_years} years. Section 32 depreciation delivers ₹{tax_benefit} in Year 1.",
      roi_hook:
        "Cash flow positive from Day 1 even on bank loan — EMI < monthly savings.",
      closing:
        "PLI scheme + solar — double advantage for manufacturing.",
    },
    operations_brief: {
      headline: "Power cut = production loss — not anymore",
      opening:
        "{kw} kW solar + grid-tie config provides stable voltage and frequency during shifts. Eliminate machine downtime from power quality issues.",
      roi_hook:
        "Every hour of downtime costs ₹{downtime_cost} — solar minimises this risk.",
      closing:
        "3-week zero-downtime installation — shift schedule unaffected.",
    },
    sustainability_story: {
      headline: "Green manufacturing — better ESG rating",
      opening:
        "{kw} kW solar reduces Scope 2 emissions by {carbon_tons} tonnes/year. Essential for EU CBAM, buyer ESG audits, and export compliance.",
      roi_hook:
        "Global buyers like Amazon, Walmart, and IKEA now audit supplier sustainability scores.",
      closing:
        "Add solar to your GHG inventory — improve export orders and valuation.",
    },
  },
  warehouse: {
    executive_pitch: {
      headline: "Big roof — why the big electricity bill?",
      opening:
        "The warehouse roof is your biggest solar asset. {kw} kW system saves ₹{savings_annual}/year — no operational changes needed.",
      roi_hook:
        "₹{savings_per_sqft}/year of additional yield per sq ft of roof — make the property productive.",
      closing:
        "Big reduction in logistics cost — book now.",
    },
    cfo_brief: {
      headline: "Direct EBITDA improvement — payout in {payback_years} years",
      opening:
        "Net ₹{net_cost}, annual saving ₹{savings_annual}. 25-year surplus ₹{surplus_lifetime} — the best CapEx in warehousing.",
      roi_hook:
        "Sale-leaseback structuring + solar tax benefit — optimise the balance sheet.",
      closing:
        "Commission before FY close — depreciation benefit this year.",
    },
    operations_brief: {
      headline: "24×7 cold storage — relief from power cuts",
      opening:
        "{kw} kW solar + hybrid config for reliable power to cold storage and conveyors. Peak demand charges reduced by up to 40% — DG dependency drops.",
      roi_hook:
        "One cold chain failure = ₹{batch_loss_inr} inventory loss + customer penalty. Solar eliminates this risk.",
      closing:
        "Weekend/off-day installation — no disruption to operations.",
    },
    sustainability_story: {
      headline: "Green logistics — Scope 3 compliant",
      opening:
        "{kw} kW solar reduces {carbon_tons} tonnes CO₂/year — qualify for e-commerce and FMCG ESG supply chains.",
      roi_hook:
        "Flipkart, Amazon Seller Central: Green Warehouse badge = priority listing and better SLA.",
      closing:
        "Add warehouse solar to sustainability report — improve client retention and new contracts.",
    },
  },
  dairy: {
    executive_pitch: {
      headline: "Keep the milk cold — keep the profits warm",
      opening:
        "Cold storage, chilling, and pasteurization electricity is the biggest operational burden in dairy. {kw} kW solar saves ₹{savings_annual}/year.",
      roi_hook:
        "₹{savings_per_litre} lower production cost per litre — compete on price without compromising quality.",
      closing:
        "NDDB/Amul supply chain-compliant solar config — start now.",
    },
    cfo_brief: {
      headline: "Payback {payback_years} years — 25-year net benefit",
      opening:
        "Net ₹{net_cost}, annual ₹{savings_annual}. DSCR 1.8× — bank financing easy. Depreciation benefit gives major tax relief in Year 1.",
      roi_hook:
        "NABARD subsidy + state scheme = effective cost 30-40% lower.",
      closing:
        "Share a one-page cost model with the cooperative board — we'll prepare it.",
    },
    operations_brief: {
      headline: "Chilling failure = batch loss — zero downtime with solar",
      opening:
        "{kw} kW solar + hybrid config for seamless power to pasteuriser, chiller, and packaging. Peak demand charge reduced by 40%.",
      roi_hook:
        "One chilling failure = ₹{batch_loss_inr} batch loss. Solar eliminates this risk.",
      closing:
        "Install before flush season — ready for peak production.",
    },
    sustainability_story: {
      headline: "Green milk — premium brand",
      opening:
        "{kw} kW solar makes dairy processing carbon-neutral. Solar certification in organic and premium segments = higher shelf price.",
      roi_hook:
        "Amul, Mother Dairy, and private label buyers are prioritising green dairy sourcing.",
      closing:
        "Apply for FSSAI Green Label and state sustainability award — solar is the first step.",
    },
  },
  school: {
    executive_pitch: {
      headline: "Lower education costs — higher quality",
      opening:
        "Electricity directly affects the per-student fee structure. {kw} kW solar saves ₹{savings_annual}/year — redirect savings to scholarships or infrastructure.",
      roi_hook:
        "₹{savings_per_student}/year saving per student — improve quality without raising fees.",
      closing:
        "Install during summer vacation — ready before the academic session starts.",
    },
    cfo_brief: {
      headline: "Trust corpus investment — back in {payback_years} years",
      opening:
        "Net ₹{net_cost}, annual ₹{savings_annual}. Section 32 + GST ITC for educational institutions. 25-year surplus ₹{surplus_lifetime}.",
      roi_hook:
        "CBSE/ICSE Green School certification: solar counts in the annual audit.",
      closing:
        "One-page financial summary for the school committee — we'll prepare it.",
    },
    operations_brief: {
      headline: "AC always on in exam hall — no power cuts",
      opening:
        "{kw} kW solar for stable power to classrooms, labs, and library. Smart meters for real-time monitoring — live energy education for students.",
      roi_hook:
        "₹{generator_cost}/month on UPS/generator saved — direct solar backup.",
      closing:
        "Install April-May — ready for the June session.",
    },
    sustainability_story: {
      headline: "Green school — inspiring the next generation",
      opening:
        "{kw} kW solar reduces {carbon_tons} tonnes CO₂/year. Live solar system as an education tool — future engineers and policy makers.",
      roi_hook:
        "CBSE Green School Award + NEP 2020 sustainability curriculum — qualify with solar.",
      closing:
        "Raise the green school flag — show parents, community, and CBSE board.",
    },
  },
};

// ─── Copy store ───────────────────────────────────────────────────────────────

const COPY_STORE: Record<StoryLang, Record<StorySegment, Record<StoryMode, StoryCopy>>> = {
  hi: HI_COPY,
  en: EN_COPY,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the story copy for a given segment and mode.
 * Falls back to English if Hindi copy is not yet available for a given combination.
 */
export function getStoryCopy(
  segment: StorySegment,
  mode: StoryMode,
  lang: StoryLang = "hi"
): StoryCopy {
  return COPY_STORE[lang]?.[segment]?.[mode] ?? EN_COPY[segment][mode];
}

/**
 * Get all four story modes for a given segment.
 * Useful for building a story-mode selector UI.
 */
export function getSegmentModes(
  segment: StorySegment,
  lang: StoryLang = "hi"
): Record<StoryMode, StoryCopy> {
  return COPY_STORE[lang]?.[segment] ?? EN_COPY[segment];
}

/**
 * List of all supported segments with display labels (Hindi-first).
 */
export const SEGMENT_LABELS: Record<StorySegment, { hi: string; en: string }> = {
  hotel:     { hi: "होटल / रिज़ॉर्ट",      en: "Hotel / Resort" },
  hospital:  { hi: "अस्पताल / क्लिनिक",   en: "Hospital / Clinic" },
  factory:   { hi: "फैक्ट्री / उद्योग",    en: "Factory / Industry" },
  warehouse: { hi: "वेयरहाउस / गोदाम",     en: "Warehouse / Cold Storage" },
  dairy:     { hi: "डेयरी / फ़ूड प्रोसेसिंग", en: "Dairy / Food Processing" },
  school:    { hi: "स्कूल / कॉलेज",         en: "School / College" },
};

/**
 * List of all story modes with display labels (Hindi-first).
 */
export const MODE_LABELS: Record<StoryMode, { hi: string; en: string }> = {
  executive_pitch:      { hi: "ओनर / बोर्ड प्रेजेंटेशन", en: "Owner / Board Pitch" },
  cfo_brief:            { hi: "CFO ब्रीफ",                en: "CFO Brief" },
  operations_brief:     { hi: "ऑपरेशंस ब्रीफ",           en: "Operations Brief" },
  sustainability_story: { hi: "सस्टेनेबिलिटी स्टोरी",   en: "Sustainability Story" },
};
