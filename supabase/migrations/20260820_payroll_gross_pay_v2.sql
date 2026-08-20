-- Persist the v2 regular-payroll calculation inputs and source-of-truth Gross Pay.
ALTER TABLE public.payroll_records_2026
  ADD COLUMN IF NOT EXISTS incomplete_month_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS calculation_version TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE public.payroll_records_2026
  DROP CONSTRAINT IF EXISTS payroll_records_2026_calculation_version_check;

ALTER TABLE public.payroll_records_2026
  ADD CONSTRAINT payroll_records_2026_calculation_version_check
  CHECK (calculation_version IN ('legacy', 'gross_pay_v2'));

COMMENT ON COLUMN public.payroll_records_2026.gross_pay IS
  'Persisted Gross Pay. NULL is retained for legacy records that predate gross_pay_v2.';
COMMENT ON COLUMN public.payroll_records_2026.incomplete_month_deduction IS
  'Editable incomplete-month proration deduction included in gross_pay for gross_pay_v2 records.';
