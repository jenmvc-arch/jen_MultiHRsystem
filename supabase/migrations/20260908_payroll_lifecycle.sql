-- Payroll lifecycle and month-scoped persistence.
ALTER TABLE public.payroll_records_2026
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by TEXT,
  ADD COLUMN IF NOT EXISTS publish_error TEXT,
  ADD COLUMN IF NOT EXISTS payslip_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payslip_sent_by TEXT,
  ADD COLUMN IF NOT EXISTS payslip_email_status TEXT,
  ADD COLUMN IF NOT EXISTS payslip_email_error TEXT;

UPDATE public.payroll_records_2026 AS payroll
SET employee_id = employees.id
FROM public.employees
WHERE payroll.employee_id IS NULL
  AND lower(payroll.employee_email) = lower(employees.email);

ALTER TABLE public.payroll_records_2026
  DROP CONSTRAINT IF EXISTS payroll_records_2026_status_check;

ALTER TABLE public.payroll_records_2026
  ADD CONSTRAINT payroll_records_2026_status_check
  CHECK (status IN ('Draft', 'Processed', 'Published'));

ALTER TABLE public.payroll_records_2026
  DROP CONSTRAINT IF EXISTS payroll_records_2026_payslip_email_status_check;

ALTER TABLE public.payroll_records_2026
  ADD CONSTRAINT payroll_records_2026_payslip_email_status_check
  CHECK (payslip_email_status IN ('sent', 'failed') OR payslip_email_status IS NULL);

CREATE INDEX IF NOT EXISTS payroll_records_2026_employee_period_idx
  ON public.payroll_records_2026 (employee_id, payroll_year, payroll_month);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_records_2026_regular_employee_period_uidx
  ON public.payroll_records_2026 (employee_id, payroll_year, payroll_month)
  WHERE payout_kind = 'regular' AND is_separate_payout = FALSE AND employee_id IS NOT NULL;
