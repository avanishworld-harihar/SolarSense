-- Sol.52 — Smart Multi-Factor MP billing snapshot columns on proposals.

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS purpose_of_supply text NULL;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS contract_demand_kva numeric NULL;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS effective_tariff_rate numeric NULL;

COMMENT ON COLUMN public.proposals.purpose_of_supply IS 'Printed purpose/use (Shops/Showrooms, Domestic, School, …) — multi-factor LV tariff';
COMMENT ON COLUMN public.proposals.contract_demand_kva IS 'Recorded contract demand in kVA when printed separately from sanctioned load';
COMMENT ON COLUMN public.proposals.effective_tariff_rate IS 'Implied ₹/kWh from reference bill Energy÷units when cross-verified';
