"use client";

/**
 * WorkspaceDealClient — tabbed deal workspace.
 *
 * Tab layout:
 *   Overview  → Deal health, intel, snapshot bar, ROI, quick actions
 *   Proposal  → Section layout editor (ProposalModulesStrip)
 *   Pricing   → Full BOM table (ProposalPricingConfigurator)
 *   Activity  → Append-only approval event timeline
 *   Files     → Attachments placeholder
 *   Approvals → Immutable pricing snapshots + approval decisions
 *
 * Design rules:
 *   - Sticky tab bar below the header — horizontally scrollable on mobile.
 *   - Tabs snap to content with a smooth fade transition.
 *   - All existing proposal flows preserved — this is an additive surface.
 *   - `/proposals/[id]` continues to work as before (not replaced).
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Coins,
  FileText,
  FolderOpen,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Store,
} from "lucide-react";

import { ProposalDetailActionsSheet } from "@/components/proposals/proposal-detail-actions-sheet";
import { ProposalDetailSection } from "@/components/proposals/proposal-detail-section";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalModulesStrip } from "@/components/proposals/proposal-modules-strip";
import { ProposalPricingConfigurator, type ProposalPricingConfiguratorLabels } from "@/components/proposals/proposal-pricing-configurator";
import { WorkspaceOverviewTab } from "@/components/workspace/tabs/workspace-overview-tab";
import { WorkspaceActivityTab } from "@/components/workspace/tabs/workspace-activity-tab";
import { WorkspaceApprovalsTab } from "@/components/workspace/tabs/workspace-approvals-tab";
import { WorkspaceCommentsTab } from "@/components/workspace/tabs/workspace-comments-tab";
import { PresenceStack } from "@/components/workspace/presence-stack";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { markProposalSent, openWhatsAppWithProposal, type ProposalShareMetrics } from "@/lib/proposal-share-actions";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import type { ProposalStatus } from "@/lib/proposal-status";
import type { ApprovalEventRow } from "@/lib/proposal-approval-events";
import type { PricingSnapshotRow } from "@/lib/proposal-snapshot-store";
import type { ProposalHubRow } from "@/lib/proposal-hub-insights";
import { useToast } from "@/components/ui/toast-center";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Tab definitions ───────────────────────────────────────────────────────

// Note: "marketplace" tab is intentionally the last — it is disabled (P10 deferred).
const TABS = ["overview", "proposal", "pricing", "activity", "files", "approvals", "comments", "marketplace"] as const;
type TabId = (typeof TABS)[number];

type TabConfig = {
  id: TabId;
  label: string;
  icon: React.ReactNode;
};

function useTabs(t: (key: string) => string): TabConfig[] {
  return useMemo(
    () => [
      { id: "overview",  label: "Overview",   icon: <LayoutGrid className="h-3.5 w-3.5" /> },
      { id: "proposal",  label: "Proposal",   icon: <FileText className="h-3.5 w-3.5" /> },
      { id: "pricing",   label: "Pricing",    icon: <Coins className="h-3.5 w-3.5" /> },
      { id: "activity",  label: "Activity",   icon: <Activity className="h-3.5 w-3.5" /> },
      { id: "files",     label: "Files",      icon: <FolderOpen className="h-3.5 w-3.5" /> },
      { id: "approvals", label: "Approvals",  icon: <BadgeCheck className="h-3.5 w-3.5" /> },
      { id: "comments",  label: "Comments",   icon: <MessageSquare className="h-3.5 w-3.5" /> },
      // P10 — disabled marketplace tab placeholder (UI-only, no schema)
      { id: "marketplace", label: "Marketplace", icon: <Store className="h-3.5 w-3.5" /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
}

// ─── Tab bar ───────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabConfig[];
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      className="sticky top-[3.75rem] z-30 -mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0"
      role="tablist"
      aria-label="Workspace tabs"
    >
      <div className="flex min-w-max gap-0.5 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0c1017]/90">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          // P10 — Marketplace tab is permanently deferred (UI-only placeholder)
          const isDisabled = tab.id === "marketplace";
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`workspace-panel-${tab.id}`}
              id={`workspace-tab-${tab.id}`}
              onClick={() => !isDisabled && onChange(tab.id as TabId)}
              disabled={isDisabled}
              title={isDisabled ? "Marketplace — coming soon" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150",
                isDisabled
                  ? "cursor-not-allowed text-slate-300 dark:text-slate-700"
                  : isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
              )}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
              {isDisabled && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:bg-white/5 dark:text-slate-600">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────

function TabPanel({ id, active, children }: { id: TabId; active: TabId; children: React.ReactNode }) {
  return (
    <div
      id={`workspace-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`workspace-tab-${id}`}
      hidden={id !== active}
    >
      {id === active ? children : null}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

export type WorkspaceDealClientProps = {
  proposalId: string;
  customerName: string;
  generatedAt: string;
  location?: string | null;
  presetId: string;
  proposalStatus: ProposalStatus;
  annualSavingInr: number;
  pptInput: PremiumProposalPptInput;
  pricing: ProposalPricingRow | null;
  timeline: ApprovalEventRow[];
  snapshots: PricingSnapshotRow[];
};

// ─── Customer initials helper ──────────────────────────────────────────────

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

// ─── Component ─────────────────────────────────────────────────────────────

export function WorkspaceDealClient({
  proposalId,
  customerName,
  generatedAt,
  location,
  presetId,
  proposalStatus: initialStatus,
  annualSavingInr,
  pptInput: initialPpt,
  pricing: initialPricing,
  timeline,
  snapshots,
}: WorkspaceDealClientProps) {
  const { t } = useLanguage();
  const toast = useToast();
  const tabs = useTabs(t);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [pptInput, setPptInput] = useState(initialPpt);
  const [pricing, setPricing] = useState<ProposalPricingRow | null>(initialPricing);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>(initialStatus);
  const [moreOpen, setMoreOpen] = useState(false);

  const mergedInput = useMemo(() => mergeProposalPricingIntoPptInput(pptInput, pricing), [pptInput, pricing]);
  const summary = useMemo(() => summarizeProposalDeck(mergedInput), [mergedInput]);
  const proposalLayout = useMemo(() => getProposalLayout(pptInput), [pptInput]);

  const shareMetrics: ProposalShareMetrics = useMemo(
    () => ({
      customerName,
      systemKw: summary.systemKw,
      netCostInr: summary.netCost,
      annualSavingInr: Math.max(0, annualSavingInr || summary.annualSaving),
      paybackLabel: summary.paybackYears > 0 ? `${summary.paybackYears} years` : "—",
    }),
    [customerName, summary, annualSavingInr]
  );

  const configuratorLabels: ProposalPricingConfiguratorLabels = useMemo(
    () => ({
      title: t("proposals_bomTitle"),
      subtitle: t("proposals_bomSub"),
      systemSize: t("proposals_systemKw"),
      categoryCol: t("proposals_bomCategory"),
      itemCol: t("proposals_bomItem"),
      brandCol: t("proposals_colBrand"),
      qtyCol: t("proposals_colQty"),
      unitCol: t("proposals_colUnit"),
      rateCol: t("proposals_colRate"),
      amountCol: t("proposals_colAmount"),
      notesCol: t("proposals_colNotes"),
      addLine: t("proposals_addLine"),
      summaryGross: t("proposals_grossTotal"),
      summarySubsidy: t("proposals_subsidy"),
      summaryDiscount: t("proposals_discount"),
      summaryNet: t("proposals_final"),
      ppwGross: t("proposals_ppwGross"),
      ppwNet: t("proposals_ppwNet"),
      manualFinal: t("proposals_manualFinal"),
      save: t("proposals_save"),
      saving: t("proposals_saving"),
      saved: t("proposals_saved"),
      saveFailed: t("proposals_saveFailed"),
      removeLine: t("proposals_removeLine"),
    }),
    [t]
  );

  const sheetLabels = useMemo(
    () => ({
      moreActions: t("proposals_detail_moreActions"),
      sheetClose: t("proposals_sheetClose"),
      openPublic: t("proposals_openWeb"),
      pdfQuote: t("proposals_cardPdfQuote"),
      send: t("proposals_cardSend"),
      duplicate: t("proposals_cardDuplicate"),
      archive: t("proposals_cardArchive"),
      jumpToPricing: t("proposals_detail_jumpToPricing"),
      comingSoon: t("proposals_comingSoon"),
      deleteProposal: t("proposals_deleteProposal"),
      deleteConfirm: t("proposals_deleteConfirm"),
      deleteDone: t("proposals_deleteDone"),
      deleteFailed: t("proposals_deleteFailed"),
      sendDone: t("proposals_sendDone"),
      pptFailed: t("proposals_pptFailed"),
    }),
    [t]
  );

  const onStatusChange = useCallback(
    async (next: ProposalStatus) => {
      const prev = proposalStatus;
      setProposalStatus(next);
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal_status: next }),
        });
        const j = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error ?? "update_failed");
      } catch {
        setProposalStatus(prev);
        toast.push({ tone: "error", title: t("proposals_statusUpdateFailed") });
      }
    },
    [proposalId, proposalStatus, t, toast]
  );

  const onPricingSaved = useCallback((row: ProposalPricingRow) => {
    setPricing(row);
    setPptInput((prev) => mergeProposalPricingIntoPptInput(prev, row));
  }, []);

  const onModulesSaved = useCallback((layout: ProposalTemplateV1) => {
    setPptInput((prev) => ({ ...prev, proposalLayout: layout }));
  }, []);

  const loc = (location ?? pptInput.location ?? "").trim();
  const headerSub = [loc, `Generated · ${new Date(generatedAt).toLocaleString("en-IN")}`]
    .filter(Boolean)
    .join(" · ");

  // Hub row shape for insight utilities
  const hubRow: ProposalHubRow = useMemo(
    () => ({
      id: proposalId,
      customer_name: customerName,
      generated_at: generatedAt,
      system_kw: summary.systemKw,
      final_amount_inr: summary.netCost,
      annual_saving_inr: annualSavingInr,
      panel_brand: null,
      proposal_status: proposalStatus,
      preset_id: presetId,
    }),
    [proposalId, customerName, generatedAt, summary.systemKw, summary.netCost, annualSavingInr, proposalStatus, presetId]
  );

  // No-pricing fallback
  if (!pricing) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-6">
        <ProposalHubHeader
          variant="workspace"
          title={t("proposals_title")}
          subtitle={t("proposals_pricingSub")}
          backHref="/proposals"
          backLabel={t("proposals_backToHub")}
        />
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#0c1017]">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pricing is not yet available for this proposal. Please apply the pricing migrations and regenerate.
          </p>
          <Button asChild variant="default" className="mt-4 font-semibold">
            <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10 pt-1">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <ProposalHubHeader
        variant="workspace"
        title={customerName}
        subtitle={headerSub}
        backHref="/proposals"
        backLabel={t("proposals_backToHub")}
        action={
          <div className="flex items-center gap-3">
            {/* Wave 4 P9 — presence avatar stack */}
            <PresenceStack proposalId={proposalId} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 font-medium"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              {t("proposals_detail_moreActions")}
            </Button>
          </div>
        }
      />

      {/* ── Actions sheet (shared across tabs) ──────────────────────── */}
      <ProposalDetailActionsSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        proposalId={proposalId}
        labels={sheetLabels}
        primaryIsSend={proposalStatus === "draft"}
        shareMetrics={shareMetrics}
        onSent={() => setProposalStatus("sent")}
      />

      {/* ── Sticky tab bar ───────────────────────────────────────────── */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── Tab panels ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Overview */}
          <TabPanel id="overview" active={activeTab}>
            <WorkspaceOverviewTab
              row={hubRow}
              proposalId={proposalId}
              proposalStatus={proposalStatus}
              annualSavingInr={annualSavingInr}
              pricing={pricing}
              summarySystemKw={summary.systemKw}
              summaryNetCost={summary.netCost}
              summaryPmSubsidy={summary.pmSubsidy}
              summaryPaybackYears={summary.paybackYears}
              summaryLifetime25Profit={summary.lifetime25Profit}
              onStatusChange={onStatusChange}
              onMoreOpen={() => setMoreOpen(true)}
            />
          </TabPanel>

          {/* Proposal — section editor */}
          <TabPanel id="proposal" active={activeTab}>
            <div className="space-y-5">
              <ProposalDetailSection
                id="sections"
                variant="workspace"
                title={t("proposals_section_modules")}
                subtitle={t("proposals_section_modulesSub")}
              >
                <ProposalModulesStrip
                  proposalId={proposalId}
                  initialLayout={proposalLayout}
                  onSaved={onModulesSaved}
                  tone="embedded"
                />
              </ProposalDetailSection>
              <ProposalDetailSection
                id="notes"
                variant="workspace"
                title={t("proposals_section_notes")}
                subtitle={t("proposals_section_notesSub")}
              >
                <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  {t("proposals_notesPlaceholder")}
                </p>
              </ProposalDetailSection>
            </div>
          </TabPanel>

          {/* Pricing — BOM table */}
          <TabPanel id="pricing" active={activeTab}>
            <ProposalDetailSection
              id="bom"
              variant="workspace"
              title={t("proposals_section_bom")}
              subtitle={t("proposals_section_bomSub")}
            >
              <ProposalPricingConfigurator
                proposalId={proposalId}
                initial={pricing}
                labels={configuratorLabels}
                onSaved={onPricingSaved}
                chrome="workspace"
              />
            </ProposalDetailSection>
          </TabPanel>

          {/* Activity */}
          <TabPanel id="activity" active={activeTab}>
            <WorkspaceActivityTab timeline={timeline} />
          </TabPanel>

          {/* Files */}
          <TabPanel id="files" active={activeTab}>
            <ProposalDetailSection
              id="attachments"
              variant="workspace"
              title={t("proposals_section_attachments")}
              subtitle={t("proposals_section_attachmentsSub")}
            >
              <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                {t("proposals_attachmentsPlaceholder")}
              </p>
            </ProposalDetailSection>
          </TabPanel>

          {/* Approvals */}
          <TabPanel id="approvals" active={activeTab}>
            <WorkspaceApprovalsTab timeline={timeline} snapshots={snapshots} />
          </TabPanel>

          {/* Comments — Wave 4 P9 */}
          <TabPanel id="comments" active={activeTab}>
            <WorkspaceCommentsTab proposalId={proposalId} />
          </TabPanel>

          {/* Marketplace — P10 deferred (UI-only placeholder, ZERO schema) */}
          <TabPanel id="marketplace" active={activeTab}>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 py-16 text-center dark:border-white/8 dark:bg-white/[0.02]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/8">
                <Store className="h-7 w-7 text-slate-400 dark:text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Marketplace — Coming Soon
                </p>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-500">
                  Verified equipment listings, procurement pricing, and vendor comparison will be available here in a future release.
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                Marketplace-ready
              </span>
            </div>
          </TabPanel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
