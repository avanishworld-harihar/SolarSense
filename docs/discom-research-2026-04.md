# SOL.52 DISCOM Research Notes (Apr 2026)

## Primary references used

- DTL States/UT utilities directory (updated Sep 2025):  
  <https://www.dtl.gov.in/Content/202_6_StateUTGencoTranscoDiscom.aspx>
- MPERC distribution tariff orders index (contains FY 2025-26 order link):  
  <https://mperc.in/page/distribution-tariff-orders>
- MP LT Tariff Schedule FY 2025-26 (slab table):  
  <https://portal.mpcz.in/upload_files/pdf/mperc_regulation/tariff_details/LT_tarrif/Tariff_LT_Year_25_26.pdf>
- MPERC FY 2025-26 retail supply tariff order PDF:  
  <https://mperc.in/uploads/petition_order_document/Final_State_DISCOMs_ARR_and_Retail_Supply_Tariff_Order_FY_2025-26_29_03_2025_3.pdf>

## MP tariff seed used in SOL.52 fallback placeholder

- Domestic energy slab rates (₹/kWh): `4.45`, `5.41`, `6.79`, `6.98`
- Fixed charge placeholder currently assumes urban LT domestic profile where complete load metadata is unavailable in onboarding stage.
- Seasonal averaging rule for MP DISCOMs: latest monthly bill + bill from 6 months ago.

## Notes

- DISCOM naming across states may vary by portal abbreviation (e.g., MPPKVVCL / MPPKVVCL variants).  
  SOL.52 uses normalized code aliases in `lib/discom-billing-rules.ts`.
- Registry is designed for deterministic state-filtered UX and can still merge Supabase-specific utilities where available.

