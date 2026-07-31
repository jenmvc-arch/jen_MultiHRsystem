-- Align employee persistence with every structured field used by the HR application.
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS opt_in_epf BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS opt_in_socso BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS opt_in_eis BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS opt_in_pcb BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS enable_lindung24 BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS socso_profile JSONB,
    ADD COLUMN IF NOT EXISTS employee_pcb_history_ledger JSONB NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS employee_tp3_declarations JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.employees.employee_pcb_history_ledger IS
    'Versioned PCB ledger entries saved by the tax reconstruction workflow.';
COMMENT ON COLUMN public.employees.employee_tp3_declarations IS
    'Employee TP3 declarations saved by the tax reconstruction workflow.';
