import type { DashboardProjectSummary, DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import type { MetricTrendLines } from "@/lib/dashboard-trends";

const STALE_MS = 3 * 86_400_000;

export type PipelineStage = {
  key: string;
  label: string;
  count: number;
  widthPct: number;
};

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

export type OperationalInsightsModel = {
  pipeline: {
    stages: PipelineStage[];
    summary: string;
    tone: "good" | "warn" | "neutral";
  };
  install: {
    active: number;
    pending: number;
    done: number;
    avgProgress: number;
    summary: string;
  };
  followUps: FollowUpRow[];
  alerts: OperationalAlert[];
  revenue: { value: string; trend: string | null };
  collections: { value: string; trend: string | null };
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

function formatInr(n: number): string {
  return `₹${Math.round(Math.max(0, n)).toLocaleString("en-IN")}`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return part > 0 ? 100 : 0;
  return Math.min(100, Math.round((part / whole) * 100));
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

export function buildOperationalInsights(
  stats: DashboardStatsPayload | null | undefined,
  trends: MetricTrendLines | null,
  uiLang: "en" | "hi"
): OperationalInsightsModel | null {
  if (!stats) return null;

  const projects = stats.recentProjects ?? [];
  const { active, pending, done, avgProgress } = pipelineFromProjects(projects);
  const maxStage = Math.max(stats.totalLeads, stats.proposalsSent, stats.orders, 1);

  const stages: PipelineStage[] = [
    {
      key: "leads",
      label: uiLang === "hi" ? "लीड्स" : "Leads",
      count: stats.totalLeads,
      widthPct: pct(stats.totalLeads, maxStage)
    },
    {
      key: "proposals",
      label: uiLang === "hi" ? "प्रस्ताव" : "Proposals",
      count: stats.proposalsSent,
      widthPct: pct(stats.proposalsSent, maxStage)
    },
    {
      key: "orders",
      label: uiLang === "hi" ? "ऑर्डर" : "Orders",
      count: stats.orders,
      widthPct: pct(stats.orders, maxStage)
    }
  ];

  const convProposal =
    stats.totalLeads > 0 ? Math.round((stats.proposalsSent / stats.totalLeads) * 100) : null;
  const convOrder =
    stats.proposalsSent > 0 ? Math.round((stats.orders / stats.proposalsSent) * 100) : null;

  let pipelineSummary: string;
  let pipelineTone: "good" | "warn" | "neutral" = "neutral";
  if (stats.totalLeads === 0) {
    pipelineSummary =
      uiLang === "hi" ? "पाइपलाइन खाली — पहली लीड जोड़ें।" : "Pipeline is empty — add your first lead.";
    pipelineTone = "warn";
  } else if (convProposal != null && convProposal < 35) {
    pipelineSummary =
      uiLang === "hi"
        ? `लीड → प्रस्ताव ${convProposal}% — प्रस्ताव बनाने पर फोकस करें।`
        : `Lead → proposal ${convProposal}% — focus on creating proposals.`;
    pipelineTone = "warn";
  } else if (convOrder != null && convOrder < 25 && stats.proposalsSent > 0) {
    pipelineSummary =
      uiLang === "hi"
        ? `प्रस्ताव → ऑर्डर ${convOrder}% — फॉलो-अप बढ़ाएँ।`
        : `Proposal → order ${convOrder}% — increase follow-through.`;
    pipelineTone = "warn";
  } else {
    pipelineSummary =
      uiLang === "hi"
        ? `पाइपलाइन संतुलित — ${stats.orders} ऑर्डर, ${stats.proposalsSent} प्रस्ताव सक्रिय।`
        : `Pipeline balanced — ${stats.orders} orders with ${stats.proposalsSent} proposals in motion.`;
    pipelineTone = "good";
  }

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
  if (stats.pendingPayments > 0) {
    alerts.push({
      id: "collections",
      tone: "amber",
      title: uiLang === "hi" ? "बकाया संग्रह" : "Collections due",
      body:
        uiLang === "hi"
          ? `${formatInr(stats.pendingPayments)} बकाया — आज फॉलो-अप शेड्यूल करें।`
          : `${formatInr(stats.pendingPayments)} outstanding — schedule follow-ups today.`,
      href: "/projects",
      cta: uiLang === "hi" ? "प्रोजेक्ट" : "Projects"
    });
  }
  const staleCount = projects.filter(
    (p) => (p.status === "pending" || p.status === "active") && isStale(p.updatedAt)
  ).length;
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

  const recentActivity: ActivityRow[] = [...projects]
    .sort((a, b) => {
      const ta = Date.parse(a.updatedAt ?? "") || 0;
      const tb = Date.parse(b.updatedAt ?? "") || 0;
      return tb - ta;
    })
    .slice(0, 4)
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
    pipeline: { stages, summary: pipelineSummary, tone: pipelineTone },
    install: { active, pending, done, avgProgress, summary: installSummary },
    followUps,
    alerts: alerts.slice(0, 4),
    revenue: {
      value: formatInr(stats.revenue),
      trend: trends?.revenue ?? null
    },
    collections: {
      value: formatInr(stats.pendingPayments),
      trend: trends?.pendingPayments ?? null
    },
    recentActivity
  };
}
