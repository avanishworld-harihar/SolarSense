import { normalizeProposalStatus, PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";

export type ProposalHubRow = {
  id: string;
  customer_name: string;
  generated_at: string;
  system_kw: number;
  lead_id?: string | null;
  final_amount_inr: number | null;
  panel_brand: string | null;
  annual_saving_inr: number | null;
  proposal_status: string;
};

export type ProposalHubStats = {
  total: number;
  followUp: number;
  approved: number;
  pipelineInr: number;
  draft: number;
};

export function computeProposalHubStats(rows: ProposalHubRow[]): ProposalHubStats {
  let followUp = 0;
  let approved = 0;
  let draft = 0;
  let pipelineInr = 0;
  for (const r of rows) {
    const st = normalizeProposalStatus(r.proposal_status);
    if (st === "draft") draft += 1;
    if (st === "sent" || st === "viewed" || st === "negotiation") followUp += 1;
    if (st === "approved") approved += 1;
    if (r.final_amount_inr != null && Number.isFinite(r.final_amount_inr)) {
      pipelineInr += Math.max(0, r.final_amount_inr);
    }
  }
  return { total: rows.length, followUp, approved, draft, pipelineInr };
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % 360;
  return h;
}

export type StatusVisual = {
  pillClass: string;
  dotClass: string;
  barClass: string;
};

export function statusVisual(st: ProposalStatus): StatusVisual {
  switch (st) {
    case "draft":
      return {
        pillClass: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
        dotClass: "bg-slate-400",
        barClass: "from-slate-500/40 to-slate-600/20"
      };
    case "sent":
      return {
        pillClass: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
        dotClass: "bg-sky-400",
        barClass: "from-sky-500/50 to-sky-600/20"
      };
    case "viewed":
      return {
        pillClass: "bg-violet-500/15 text-violet-200 ring-violet-500/30",
        dotClass: "bg-violet-400",
        barClass: "from-violet-500/50 to-violet-600/20"
      };
    case "negotiation":
      return {
        pillClass: "bg-amber-500/15 text-amber-100 ring-amber-500/35",
        dotClass: "bg-amber-400",
        barClass: "from-amber-500/50 to-amber-600/20"
      };
    case "approved":
      return {
        pillClass: "bg-emerald-500/15 text-emerald-100 ring-emerald-500/35",
        dotClass: "bg-emerald-400",
        barClass: "from-emerald-500/50 to-emerald-600/20"
      };
    default:
      return {
        pillClass: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
        dotClass: "bg-slate-400",
        barClass: "from-slate-500/40 to-slate-600/20"
      };
  }
}

/** Deal progress 0–100 for workspace health bar (not fake — maps to CRM status). */
export function statusProgressPct(st: ProposalStatus): number {
  const idx = PROPOSAL_STATUS_ORDER.indexOf(st);
  if (idx < 0) return 10;
  return Math.round(((idx + 1) / PROPOSAL_STATUS_ORDER.length) * 100);
}

export type IntelInsight = {
  title: string;
  body: string;
  tone: "neutral" | "action" | "success" | "warn";
};

export function hubIntelForStatus(st: ProposalStatus, lang: "en" | "hi"): IntelInsight {
  const en: Record<ProposalStatus, IntelInsight> = {
    draft: {
      title: "Finish the quote",
      body: "Check pricing and BOM, then generate the web proposal link for the customer.",
      tone: "action"
    },
    sent: {
      title: "Follow up today",
      body: "The proposal is out — confirm they received the link on WhatsApp.",
      tone: "action"
    },
    viewed: {
      title: "Interest is warm",
      body: "They opened the proposal. Call now to answer subsidy and payback questions.",
      tone: "warn"
    },
    negotiation: {
      title: "Close the numbers",
      body: "Adjust pricing in the workspace or send an updated quote if terms changed.",
      tone: "warn"
    },
    approved: {
      title: "Move to install",
      body: "Deal approved — book site survey and hand off to your projects team.",
      tone: "success"
    }
  };
  const hi: Record<ProposalStatus, IntelInsight> = {
    draft: {
      title: "कोट पूरा करें",
      body: "प्राइसिंग और BOM चेक करें, फिर ग्राहक को वेब प्रस्ताव लिंक भेजें।",
      tone: "action"
    },
    sent: {
      title: "आज फॉलो-अप",
      body: "प्रस्ताव भेज दिया है — WhatsApp पर लिंक मिला या नहीं, पूछें।",
      tone: "action"
    },
    viewed: {
      title: "रुचि अच्छी है",
      body: "ग्राहक ने प्रस्ताव खोला। सब्सिडी और पेबैक पर अभी कॉल करें।",
      tone: "warn"
    },
    negotiation: {
      title: "कीमत पर बात",
      body: "वर्कस्पेस में प्राइसिंग बदलें या नया कोट भेजें।",
      tone: "warn"
    },
    approved: {
      title: "इंस्टॉल पर आगे",
      body: "डील मंजूर — साइट सर्वे बुक करें और प्रोजेक्ट टीम को दें।",
      tone: "success"
    }
  };
  return lang === "hi" ? hi[st] : en[st];
}

export function hubNextActionHint(st: ProposalStatus, lang: "en" | "hi"): string {
  return hubIntelForStatus(st, lang).body;
}
