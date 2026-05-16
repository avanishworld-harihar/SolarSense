import type { DashboardProjectSummary, DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import type { MetricTrendLines } from "@/lib/dashboard-trends";

const STALE_MS = 3 * 86_400_000;

export type FollowUpRow = {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  stale: boolean;
};

export type ActivityRow = {
  id: string;
  name: string;
  detail: string;
  timeLabel: string;
  href: string;
};

export type OperationalAlert = {
  id: string;
  tone: "amber" | "rose" | "sky" | "emerald";
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

export type OverdueItem = {
  id: string;
  tone: "amber" | "rose" | "sky";
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

export type ConversionFunnel = {
  leadToProposalPct: number | null;
  proposalToOrderPct: number | null;
  summary: string;
  tone: "good" | "warn" | "neutral";
};

export type CollectionTrendInsight = {
  revenueTrend: string | null;
  pendingTrend: string | null;
  insight: string;
  tone: "good" | "warn" | "neutral";
  hasOutstanding: boolean;
};

export type BusinessInsight = {
  id: string;
  tone: "emerald" | "sky" | "amber" | "violet";
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

export type OperationalInsightsModel = {
  conversion: ConversionFunnel;
  collectionTrend: CollectionTrendInsight;
  overdue: { items: OverdueItem[]; summary: string };
  install: {
    active: number;
    pending: number;
    done: number;
    avgProgress: number;
    summary: string;
  };
  followUps: FollowUpRow[];
  alerts: OperationalAlert[];
  businessInsights: BusinessInsight[];
  recentActivity: ActivityRow[];
};

function relativeTime(iso: string | null | undefined, uiLang: "en" | "hi"): string {
  if (!iso) return uiLang === "hi" ? "हाल में" : "Recently";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return uiLang === "hi" ? "हाल में" : "Recently";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return uiLang === "hi" ? "आज" : "Today";
  if (days === 1) return uiLang === "hi" ? "कल" : "Yesterday";
  return uiLang === "hi" ? `${days} दिन पहले` : `${days}d ago`;
}

function isStale(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > STALE_MS;
}

function pipelineFromProjects(projects: DashboardProjectSummary[]) {
  let active = 0;
  let pending = 0;
  let done = 0;
  let progressSum = 0;
  let progressN = 0;
  for (const p of projects) {
    if (p.status === "active") active++;
    else if (p.status === "pending") pending++;
    else if (p.status === "done") done++;
    if (p.status === "active" || p.status === "pending") {
      progressSum += Math.min(100, Math.max(0, p.installProgress ?? 0));
      progressN++;
    }
  }
  const avgProgress = progressN > 0 ? Math.round(progressSum / progressN) : 0;
  return { active, pending, done, avgProgress };
}

function trendTone(
  deltaKey: "revenue" | "pendingPayments",
  trends: MetricTrendLines | null,
  stats: DashboardStatsPayload
): "good" | "warn" | "neutral" {
  if (deltaKey === "pendingPayments" && stats.pendingPayments > 0) return "warn";
  const line = trends?.[deltaKey];
  if (!line) return "neutral";
  if (line.includes("more") || line.includes("ज़्यादा") || line.includes("அதிகம்")) return "good";
  if (line.includes("less") || line.includes("कम") || line.includes("குறை")) return "warn";
  if (line.includes("up") || line.includes("बढ़ा") || line.includes("அதிகரித்த")) return "warn";
  if (line.includes("down") || line.includes("घटा") || line.includes("குறைந்த")) return "good";
  return "neutral";
}

export function buildOperationalInsights(
  stats: DashboardStatsPayload | null | undefined,
  trends: MetricTrendLines | null,
  uiLang: "en" | "hi"
): OperationalInsightsModel | null {
  if (!stats) return null;

  const projects = stats.recentProjects ?? [];
  const { active, pending, done, avgProgress } = pipelineFromProjects(projects);

  const leadToProposalPct =
    stats.totalLeads > 0 ? Math.round((stats.proposalsSent / stats.totalLeads) * 100) : null;
  const proposalToOrderPct =
    stats.proposalsSent > 0 ? Math.round((stats.orders / stats.proposalsSent) * 100) : null;

  let conversionSummary: string;
  let conversionTone: "good" | "warn" | "neutral" = "neutral";
  if (stats.totalLeads === 0) {
    conversionSummary =
      uiLang === "hi" ? "फनल शुरू करें — पहली लीड जोड़ें।" : "Start the funnel — add your first lead.";
    conversionTone = "warn";
  } else if (leadToProposalPct != null && leadToProposalPct < 35) {
    conversionSummary =
      uiLang === "hi"
        ? "लीड → प्रस्ताव दर कम — प्रस्ताव बनाने पर ध्यान दें।"
        : "Lead → proposal rate is low — prioritize proposal creation.";
    conversionTone = "warn";
  } else if (proposalToOrderPct != null && proposalToOrderPct < 25 && stats.proposalsSent > 0) {
    conversionSummary =
      uiLang === "hi"
        ? "प्रस्ताव → ऑर्डर दर कम — गर्म लीड्स को कॉल करें।"
        : "Proposal → order rate is low — call warm leads today.";
    conversionTone = "warn";
  } else {
    conversionSummary =
      uiLang === "hi"
        ? "कन्वर्ज़न स्वस्थ — मोमेंटम बनाए रखें।"
        : "Conversion healthy — keep momentum on active proposals.";
    conversionTone = "good";
  }

  const hasOutstanding = stats.pendingPayments > 0;
  let collectionInsight: string;
  if (!trends?.revenue && !trends?.pendingPayments) {
    collectionInsight =
      uiLang === "hi"
        ? "पहली सिंक के बाद संग्रह ट्रेंड दिखेगा। राशि कमांड सेंटर में।"
        : "Collection trends appear after your next sync. Amounts live in Command Center.";
  } else if (hasOutstanding) {
    collectionInsight =
      uiLang === "hi"
        ? "बकाया संग्रह प्राथमिक — कमांड सेंटर में वित्तीय पल्स देखें।"
        : "Collections need attention — see Financial pulse in Command Center.";
  } else if (trendTone("revenue", trends, stats) === "good") {
    collectionInsight =
      uiLang === "hi" ? "संग्रह ट्रेंड सकारात्मक — गति बनाए रखें।" : "Collection trend is positive — maintain pace.";
  } else {
    collectionInsight =
      uiLang === "hi"
        ? "सिंक के बाद स्थिर — नई इनवॉइस पर नज़र रखें।"
        : "Stable since last sync — watch for new invoices.";
  }

  const overdueItems: OverdueItem[] = [];
  if (hasOutstanding) {
    overdueItems.push({
      id: "collections-overdue",
      tone: "amber",
      title: uiLang === "hi" ? "बकाया संग्रह" : "Collections overdue",
      body:
        uiLang === "hi"
          ? "बकाया बैलेंस सक्रिय — आज फॉलो-अप और पेमेंट लिंक भेजें।"
          : "Outstanding balance active — follow up and send payment links today.",
      href: "/projects",
      cta: uiLang === "hi" ? "प्रोजेक्ट" : "Projects"
    });
  }
  const staleCount = projects.filter(
    (p) => (p.status === "pending" || p.status === "active") && isStale(p.updatedAt)
  ).length;
  if (staleCount > 0) {
    overdueItems.push({
      id: "stale-overdue",
      tone: "rose",
      title: uiLang === "hi" ? "रुके हुए अपडेट" : "Stale project updates",
      body:
        uiLang === "hi"
          ? `${staleCount} प्रोजेक्ट 3+ दिन से अपडेट नहीं।`
          : `${staleCount} project(s) with no update in 3+ days.`,
      href: "/projects",
      cta: uiLang === "hi" ? "समीक्षा" : "Review"
    });
  }
  if (stats.proposalsSent > 0 && stats.orders === 0) {
    overdueItems.push({
      id: "conversion-stuck",
      tone: "sky",
      title: uiLang === "hi" ? "कन्वर्ज़न अटका" : "Conversion stalled",
      body:
        uiLang === "hi"
          ? "प्रस्ताव भेजे गए, ऑर्डर शून्य — गर्म लीड्स को कॉल करें।"
          : "Proposals sent, zero orders — prioritize closing calls.",
      href: "/proposals",
      cta: uiLang === "hi" ? "प्रस्ताव" : "Proposals"
    });
  }

  const overdueSummary =
    overdueItems.length > 0
      ? uiLang === "hi"
        ? `${overdueItems.length} ध्यान देने योग्य क्षेत्र`
        : `${overdueItems.length} area(s) need attention`
      : uiLang === "hi"
        ? "कोई ओवरड्यू आइटम नहीं"
        : "No overdue items — operations on track";

  const followUps: FollowUpRow[] = projects
    .filter((p) => p.status === "pending" || p.status === "active")
    .map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.nextAction?.trim() || p.detail,
      href: `/projects`,
      stale: isStale(p.updatedAt)
    }))
    .sort((a, b) => (a.stale === b.stale ? 0 : a.stale ? -1 : 1))
    .slice(0, 5);

  const alerts: OperationalAlert[] = [];
  if (hasOutstanding) {
    alerts.push({
      id: "collections",
      tone: "amber",
      title: uiLang === "hi" ? "बकाया संग्रह" : "Collections due",
      body:
        uiLang === "hi"
          ? "बकाया बैलेंस — आज फॉलो-अप शेड्यूल करें (राशि ऊपर देखें)।"
          : "Outstanding balance — schedule follow-ups today (see Command Center).",
      href: "/projects",
      cta: uiLang === "hi" ? "प्रोजेक्ट" : "Projects"
    });
  }
  if (staleCount > 0) {
    alerts.push({
      id: "stale",
      tone: "rose",
      title: uiLang === "hi" ? "रुके हुए प्रोजेक्ट" : "Stalled projects",
      body:
        uiLang === "hi"
          ? `${staleCount} प्रोजेक्ट 3+ दिन से अपडेट नहीं — स्टेटस चेक करें।`
          : `${staleCount} project(s) idle 3+ days — review status and next steps.`,
      href: "/projects",
      cta: uiLang === "hi" ? "खोलें" : "Review"
    });
  }
  if (pending > 0) {
    alerts.push({
      id: "approvals",
      tone: "sky",
      title: uiLang === "hi" ? "लंबित अप्रूवल" : "Pending approvals",
      body:
        uiLang === "hi"
          ? `${pending} प्रोजेक्ट अप्रूवल / साइन-ऑफ की प्रतीक्षा में।`
          : `${pending} project(s) awaiting approval or sign-off.`,
      href: "/projects",
      cta: uiLang === "hi" ? "देखें" : "View"
    });
  }
  if (stats.proposalsSent > 0 && stats.orders === 0) {
    alerts.push({
      id: "close",
      tone: "emerald",
      title: uiLang === "hi" ? "क्लोज़िंग अवसर" : "Closing opportunity",
      body:
        uiLang === "hi"
          ? "प्रस्ताव भेजे गए — ऑर्डर कन्वर्ज़न के लिए कॉल करें।"
          : "Proposals are out — call warm leads to convert to orders.",
      href: "/proposals",
      cta: uiLang === "hi" ? "प्रस्ताव" : "Proposals"
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "clear",
      tone: "emerald",
      title: uiLang === "hi" ? "ऑपरेशन साफ़" : "Operations clear",
      body:
        uiLang === "hi"
          ? "कोई तात्कालिक अलर्ट नहीं — पाइपलाइन पर ध्यान दें।"
          : "No urgent alerts — stay focused on pipeline momentum."
    });
  }

  const businessInsights: BusinessInsight[] = [];
  if (stats.proposalsSent > 0 && stats.orders === 0) {
    businessInsights.push({
      id: "close-orders",
      tone: "violet",
      title: uiLang === "hi" ? "ऑर्डर कन्वर्ज़न" : "Close to orders",
      body:
        uiLang === "hi"
          ? `${stats.proposalsSent} सक्रिय प्रस्ताव — आज 3 गर्म लीड्स को कॉल करें।`
          : `${stats.proposalsSent} active proposals — call 3 warm leads today.`,
      href: "/proposals",
      cta: uiLang === "hi" ? "प्रस्ताव खोलें" : "Open proposals"
    });
  }
  if (hasOutstanding) {
    businessInsights.push({
      id: "collect",
      tone: "amber",
      title: uiLang === "hi" ? "संग्रह ध्यान" : "Collection focus",
      body:
        uiLang === "hi"
          ? "बकाया खातों पर कॉल करें और पेमेंट लिंक भेजें।"
          : "Call outstanding accounts and send payment links before EOD.",
      href: "/projects",
      cta: uiLang === "hi" ? "प्रोजेक्ट" : "Projects"
    });
  }
  if (leadToProposalPct != null && leadToProposalPct < 50 && stats.totalLeads > 3) {
    businessInsights.push({
      id: "propose-more",
      tone: "sky",
      title: uiLang === "hi" ? "प्रस्ताव गति" : "Proposal velocity",
      body:
        uiLang === "hi"
          ? `लीड → प्रस्ताव ${leadToProposalPct}% — नई प्रस्ताव बनाएँ।`
          : `Lead → proposal at ${leadToProposalPct}% — create proposals from top leads.`,
      href: "/proposal",
      cta: uiLang === "hi" ? "नया प्रस्ताव" : "New proposal"
    });
  }
  if (trends?.proposalsSent && trends.proposalsSent.includes("+")) {
    businessInsights.push({
      id: "momentum",
      tone: "emerald",
      title: uiLang === "hi" ? "पाइपलाइन गति" : "Pipeline momentum",
      body: trends.proposalsSent,
      href: "/proposals",
      cta: uiLang === "hi" ? "देखें" : "View"
    });
  }
  if (businessInsights.length === 0) {
    businessInsights.push({
      id: "steady",
      tone: "emerald",
      title: uiLang === "hi" ? "स्थिर संचालन" : "Steady operations",
      body:
        uiLang === "hi"
          ? "कोई तात्कालिक कार्रवाई नहीं — नई लीड कैप्चर करते रहें।"
          : "No urgent actions — keep capturing leads and updating projects.",
      href: "/customers?add=1",
      cta: uiLang === "hi" ? "लीड जोड़ें" : "Add lead"
    });
  }

  const recentActivity: ActivityRow[] = [...projects]
    .sort((a, b) => {
      const ta = Date.parse(a.updatedAt ?? "") || 0;
      const tb = Date.parse(b.updatedAt ?? "") || 0;
      return tb - ta;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      detail: p.nextAction?.trim() || p.detail,
      timeLabel: relativeTime(p.updatedAt, uiLang),
      href: "/projects"
    }));

  const installSummary =
    projects.length === 0
      ? uiLang === "hi"
        ? "कोई सक्रिय इंस्टॉलेशन नहीं — प्रोजेक्ट बनाएँ।"
        : "No active installations — create a project to track progress."
      : uiLang === "hi"
        ? `${active} सक्रिय, ${pending} लंबित — औसत प्रगति ${avgProgress}%।`
        : `${active} active, ${pending} pending — average progress ${avgProgress}%.`;

  return {
    conversion: {
      leadToProposalPct,
      proposalToOrderPct,
      summary: conversionSummary,
      tone: conversionTone
    },
    collectionTrend: {
      revenueTrend: trends?.revenue ?? null,
      pendingTrend: trends?.pendingPayments ?? null,
      insight: collectionInsight,
      tone: trendTone("pendingPayments", trends, stats),
      hasOutstanding
    },
    overdue: { items: overdueItems.slice(0, 4), summary: overdueSummary },
    install: { active, pending, done, avgProgress, summary: installSummary },
    followUps,
    alerts: alerts.slice(0, 4),
    businessInsights: businessInsights.slice(0, 4),
    recentActivity
  };
}
