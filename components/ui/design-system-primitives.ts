/**
 * E1 Design System Primitives — barrel export
 *
 * Import new primitives from here. Existing components (MetricCard, GlassPanel,
 * BlockStatTile, KpiCard, etc.) are NOT affected — they continue to work unchanged.
 *
 * Usage:
 *   import { KpiTile, Panel, Reveal, Eyebrow, SectionHeader, IconWell } from "@/components/ui/design-system-primitives";
 *   import { DS } from "@/lib/design-system";
 */

export { KpiTile } from "@/components/ui/kpi-tile";
export type { KpiTileProps, KpiDensity, KpiTileDashboardProps, KpiTileBlockProps, KpiTileCommercialProps } from "@/components/ui/kpi-tile";

export { Panel, PanelRow, PanelSection } from "@/components/ui/panel";
export type { PanelProps, PanelTone, PanelPadding } from "@/components/ui/panel";

export { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
export type { RevealProps, RevealDensity } from "@/components/ui/reveal";

export { IconWell } from "@/components/ui/icon-well";
export type { IconWellProps, IconWellSize } from "@/components/ui/icon-well";

export { Eyebrow } from "@/components/ui/eyebrow";
export type { EyebrowProps, EyebrowSize, EyebrowLang } from "@/components/ui/eyebrow";

export { SectionHeader } from "@/components/ui/section-header";
export type { SectionHeaderProps, SectionHeaderVariant } from "@/components/ui/section-header";

export { useCountUp, useCountUpNumber } from "@/components/ui/count-up-hook";
export type { CountUpOptions } from "@/components/ui/count-up-hook";
