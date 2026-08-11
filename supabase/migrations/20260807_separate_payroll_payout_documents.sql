-- Store separately generated payroll payout documents without merging them
-- into the employee's regular monthly salary record.
ALTER TABLE public.payroll_records_2026
    ADD COLUMN IF NOT EXISTS payout_kind TEXT NOT NULL DEFAULT 'regular',
    ADD COLUMN IF NOT EXISTS is_separate_payout BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS statutory_treatment TEXT,
    ADD COLUMN IF NOT EXISTS payout_title TEXT,
    ADD COLUMN IF NOT EXISTS payout_description TEXT,
    ADD COLUMN IF NOT EXISTS line_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS document_type TEXT,
    ADD COLUMN IF NOT EXISTS compensation_label TEXT,
    ADD COLUMN IF NOT EXISTS display_settings_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.payroll_records_2026.payout_kind IS
    'regular, bonus, incentive_commission, or claim_reimbursement.';
COMMENT ON COLUMN public.payroll_records_2026.is_separate_payout IS
    'True for independently generated payout documents that must not replace monthly payroll.';
COMMENT ON COLUMN public.payroll_records_2026.line_notes IS
    'Long descriptions keyed by earning or deduction field name for document output.';
