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

-- Older imports can contain more than one regular record for the same
-- employee/month. Keep the most advanced lifecycle state, then the newest
-- version, so the unique index can be created without discarding a published
-- or processed payroll in favour of an older draft.
WITH ranked_regular_payroll AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY employee_id, payroll_year, payroll_month
      ORDER BY
        CASE status
          WHEN 'Published' THEN 3
          WHEN 'Processed' THEN 2
          ELSE 1
        END DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS duplicate_rank
  FROM public.payroll_records_2026
  WHERE payout_kind = 'regular'
    AND is_separate_payout = FALSE
    AND employee_id IS NOT NULL
)
DELETE FROM public.payroll_records_2026 AS payroll
USING ranked_regular_payroll AS ranked
WHERE payroll.ctid = ranked.ctid
  AND ranked.duplicate_rank > 1;

CREATE INDEX IF NOT EXISTS payroll_records_2026_employee_period_idx
  ON public.payroll_records_2026 (employee_id, payroll_year, payroll_month);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_records_2026_regular_employee_period_uidx
  ON public.payroll_records_2026 (employee_id, payroll_year, payroll_month)
  WHERE payout_kind = 'regular' AND is_separate_payout = FALSE AND employee_id IS NOT NULL;
