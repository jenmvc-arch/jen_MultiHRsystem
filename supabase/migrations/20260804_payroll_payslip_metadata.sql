-- Store per-pay-period printable payslip line descriptions.
ALTER TABLE public.payroll_records_2026
    ADD COLUMN IF NOT EXISTS payment_date DATE,
    ADD COLUMN IF NOT EXISTS payslip_descriptions JSONB NOT NULL DEFAULT '{}'::jsonb;
