-- Persist the v2 regular-payroll calculation inputs and source-of-truth Gross Pay.
ALTER TABLE public.payroll_records_2026
  ADD COLUMN IF NOT EXISTS allowance_general NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_transport NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_parking NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_meal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_accommodation NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_phone NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_desc TEXT,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_desc TEXT,
  ADD COLUMN IF NOT EXISTS back_pay_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS back_pay_desc TEXT,
  ADD COLUMN IF NOT EXISTS aws_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aws_desc TEXT,
  ADD COLUMN IF NOT EXISTS compensation_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compensation_desc TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reimbursement_desc TEXT,
  ADD COLUMN IF NOT EXISTS unpaid_leave NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_in_lieu NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_cp38 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_others NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_others_desc TEXT,
  ADD COLUMN IF NOT EXISTS actual_pcb_deducted NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lindung24_employee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hrd_corp NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_kind TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS is_separate_payout BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS statutory_treatment TEXT,
  ADD COLUMN IF NOT EXISTS payout_title TEXT,
  ADD COLUMN IF NOT EXISTS payout_description TEXT,
  ADD COLUMN IF NOT EXISTS line_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS compensation_label TEXT,
  ADD COLUMN IF NOT EXISTS display_settings_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payslip_descriptions JSONB NOT NULL DEFAULT '{}'::jsonb,
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
