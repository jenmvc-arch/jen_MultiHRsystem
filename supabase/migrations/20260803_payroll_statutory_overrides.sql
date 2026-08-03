-- Persist editable pay-period values, including every statutory override used by payslips.
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
    ADD COLUMN IF NOT EXISTS net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE public.payroll_records_2026
SET actual_pcb_deducted = tax_pcb
WHERE actual_pcb_deducted = 0 AND tax_pcb <> 0;

UPDATE public.payroll_records_2026
SET net_pay = net_salary
WHERE net_pay = 0 AND net_salary <> 0;
