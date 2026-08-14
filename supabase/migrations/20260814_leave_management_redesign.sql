-- Supabase-backed leave engine for the employee portal and HR admin console.
-- Apply this migration to the employee Supabase project.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.leave_types (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    default_entitlement_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    leave_group TEXT,
    condition TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    system_managed BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    policy_id TEXT,
    carry_over_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, name)
);

CREATE TABLE IF NOT EXISTS public.leave_condition_policies (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    deduction_rule TEXT NOT NULL DEFAULT 'working_days_excluding_holidays',
    rounding_rule TEXT NOT NULL DEFAULT 'nearest_half_day',
    proration_rule TEXT NOT NULL DEFAULT 'joiner_proration',
    entitlement_rule TEXT NOT NULL DEFAULT 'calendar_year',
    entitlement_days NUMERIC(8, 2),
    paid_treatment TEXT NOT NULL DEFAULT 'paid'
        CHECK (paid_treatment IN ('paid', 'unpaid')),
    excess_leave_handling TEXT NOT NULL DEFAULT 'payroll_deduction'
        CHECK (excess_leave_handling IN ('allow', 'reject', 'payroll_deduction')),
    payroll_deduction_behavior TEXT NOT NULL DEFAULT 'deduct_excess'
        CHECK (payroll_deduction_behavior IN ('none', 'deduct_excess', 'deduct_all')),
    exclude_weekends BOOLEAN NOT NULL DEFAULT TRUE,
    exclude_public_holidays BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_carryover_settings (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    carry_forward_rule TEXT NOT NULL DEFAULT 'none'
        CHECK (carry_forward_rule IN ('none', 'full_balance', 'capped')),
    max_carry_forward_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    expiry_rule TEXT NOT NULL DEFAULT 'no_expiry'
        CHECK (expiry_rule IN ('no_expiry', 'fixed_date', 'months_after_year_end')),
    expiry_date DATE,
    expiry_months INTEGER NOT NULL DEFAULT 0,
    rule_details TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_groups (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    policy_id TEXT,
    carry_over_id TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_group_items (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES public.leave_groups(id) ON DELETE CASCADE,
    leave_type_id TEXT NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
    policy_id TEXT NOT NULL,
    carry_over_id TEXT NOT NULL,
    entitlement_days NUMERIC(8, 2),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS public.employee_leave_group_assignments (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES public.leave_groups(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    leave_type_id TEXT,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    excess_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    payroll_month INTEGER,
    payroll_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.off_in_lieu_requests (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    employee_names JSONB NOT NULL DEFAULT '[]'::jsonb,
    expiry_date DATE NOT NULL,
    total_days_per_employee NUMERIC(8, 2) NOT NULL DEFAULT 0,
    total_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected')),
    submission_mode TEXT NOT NULL DEFAULT 'single'
        CHECK (submission_mode IN ('single', 'bulk')),
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    submitted_by TEXT NOT NULL,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.off_in_lieu_entries (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    request_id TEXT NOT NULL REFERENCES public.off_in_lieu_requests(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    working_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
    eligible_days NUMERIC(6, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_balance_ledger (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    leave_type_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    entry_type TEXT NOT NULL
        CHECK (entry_type IN ('credit', 'debit', 'carry_over', 'expiry', 'adjustment')),
    source_type TEXT NOT NULL
        CHECK (source_type IN ('entitlement', 'leave_request', 'off_in_lieu', 'carry_over', 'manual', 'expiry')),
    source_id TEXT,
    quantity NUMERIC(8, 2) NOT NULL DEFAULT 0,
    expires_at DATE,
    occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_payroll_deductions (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    leave_request_id TEXT,
    payroll_month INTEGER NOT NULL,
    payroll_year INTEGER NOT NULL,
    leave_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Synced', 'Failed')),
    synced_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, leave_request_id, payroll_month, payroll_year)
);

CREATE INDEX IF NOT EXISTS leave_types_entity_idx ON public.leave_types (entity_id, enabled);
CREATE INDEX IF NOT EXISTS leave_policies_entity_idx ON public.leave_condition_policies (entity_id, enabled);
CREATE INDEX IF NOT EXISTS leave_groups_entity_idx ON public.leave_groups (entity_id, enabled);
CREATE INDEX IF NOT EXISTS leave_assignments_employee_idx ON public.employee_leave_group_assignments (entity_id, employee_id, active);
CREATE INDEX IF NOT EXISTS leave_requests_employee_idx ON public.leave_requests (entity_id, employee_id, applied_date DESC);
CREATE INDEX IF NOT EXISTS off_in_lieu_employee_idx ON public.off_in_lieu_requests (entity_id, status, applied_date DESC);
CREATE INDEX IF NOT EXISTS leave_ledger_employee_idx ON public.leave_balance_ledger (entity_id, employee_id, leave_type_id, expires_at);
CREATE INDEX IF NOT EXISTS leave_deductions_payroll_idx ON public.leave_payroll_deductions (entity_id, payroll_year, payroll_month);

CREATE OR REPLACE FUNCTION public.set_leave_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_types_updated_at ON public.leave_types;
CREATE TRIGGER leave_types_updated_at BEFORE UPDATE ON public.leave_types
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_policies_updated_at ON public.leave_condition_policies;
CREATE TRIGGER leave_policies_updated_at BEFORE UPDATE ON public.leave_condition_policies
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_carryover_updated_at ON public.leave_carryover_settings;
CREATE TRIGGER leave_carryover_updated_at BEFORE UPDATE ON public.leave_carryover_settings
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_groups_updated_at ON public.leave_groups;
CREATE TRIGGER leave_groups_updated_at BEFORE UPDATE ON public.leave_groups
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_group_items_updated_at ON public.leave_group_items;
CREATE TRIGGER leave_group_items_updated_at BEFORE UPDATE ON public.leave_group_items
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS off_in_lieu_requests_updated_at ON public.off_in_lieu_requests;
CREATE TRIGGER off_in_lieu_requests_updated_at BEFORE UPDATE ON public.off_in_lieu_requests
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();
DROP TRIGGER IF EXISTS leave_deductions_updated_at ON public.leave_payroll_deductions;
CREATE TRIGGER leave_deductions_updated_at BEFORE UPDATE ON public.leave_payroll_deductions
FOR EACH ROW EXECUTE FUNCTION public.set_leave_updated_at();

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_condition_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_carryover_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.off_in_lieu_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.off_in_lieu_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_payroll_deductions ENABLE ROW LEVEL SECURITY;

-- The current HRMS browser uses the anon client for local/demo deployments.
-- Production deployments should replace these policies with authenticated,
-- employee-scoped policies once the employee auth session is enabled.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'leave_types',
        'leave_condition_policies',
        'leave_carryover_settings',
        'leave_groups',
        'leave_group_items',
        'employee_leave_group_assignments',
        'leave_requests',
        'off_in_lieu_requests',
        'off_in_lieu_entries',
        'leave_balance_ledger',
        'leave_payroll_deductions'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Leave app access" ON public.%I', table_name);
        EXECUTE format('CREATE POLICY "Leave app access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name);
    END LOOP;
END
$$;

-- Seed the default catalogue for both existing company entities.
WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT)),
defaults(id, name, code, entitlement, leave_group, condition, system_managed) AS (
    VALUES
      ('annual-leave', 'Annual Leave', 'AL', 18::NUMERIC, 'Full-Time Standard', 'Paid leave', FALSE),
      ('sick-leave', 'Sick Leave', 'SL', 14::NUMERIC, 'All Staff', 'Paid leave', FALSE),
      ('hospitalisation-leave', 'Hospitalisation Leave', 'HL', 60::NUMERIC, 'All Staff', 'Paid leave', FALSE),
      ('maternity-leave', 'Maternity Leave', 'ML', 98::NUMERIC, 'Full-Time Standard', 'Paid leave', FALSE),
      ('paternity-leave', 'Paternity Leave', 'PL', 7::NUMERIC, 'Full-Time Standard', 'Paid leave', FALSE),
      ('compassionate-leave', 'Compassionate Leave', 'CL', 3::NUMERIC, 'All Staff', 'Paid leave', FALSE),
      ('unpaid-leave', 'Unpaid Leave', 'UL', 30::NUMERIC, 'All Staff', 'Unpaid leave', FALSE),
      ('replacement-leave', 'Replacement Leave', 'RPL', 0::NUMERIC, 'System Managed', 'Off in Lieu credit', TRUE)
)
INSERT INTO public.leave_types (
    id, entity_id, name, code, default_entitlement_days, leave_group, condition,
    is_default, system_managed, enabled, policy_id, carry_over_id
)
SELECT d.id || '-' || e.entity_id, e.entity_id, d.name, d.code, d.entitlement, d.leave_group, d.condition,
       TRUE, d.system_managed, TRUE,
       'leave-policy-standard-' || e.entity_id,
       'leave-carry-over-standard-' || e.entity_id
FROM entities e
CROSS JOIN defaults d
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT))
INSERT INTO public.leave_condition_policies (
    id, entity_id, name, deduction_rule, rounding_rule, proration_rule, entitlement_rule,
    entitlement_days, paid_treatment, excess_leave_handling, payroll_deduction_behavior,
    exclude_weekends, exclude_public_holidays, notes
)
SELECT 'leave-policy-standard-' || entity_id, entity_id, 'Standard Malaysia Leave Policy',
       'working_days_excluding_holidays', 'nearest_half_day', 'joiner_proration', 'calendar_year',
       18, 'paid', 'payroll_deduction', 'deduct_excess', TRUE, TRUE,
       'Standard full-time employee leave policy with half-day support.'
FROM entities
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT))
INSERT INTO public.leave_carryover_settings (
    id, entity_id, name, carry_forward_rule, max_carry_forward_days,
    expiry_rule, expiry_date, expiry_months, rule_details, notes
)
SELECT 'leave-carry-over-standard-' || entity_id, entity_id, 'Standard Annual Carry Over',
       'capped', 5, 'fixed_date', '2027-03-31', 3,
       'Unused carried-forward days expire at the end of the first quarter.',
       'Unused carried-forward days expire at the end of the first quarter.'
FROM entities
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT))
INSERT INTO public.leave_groups (
    id, entity_id, name, description, policy_id, carry_over_id, enabled
)
SELECT 'full-time-standard-' || entity_id, entity_id, 'Full-Time Standard',
       'Standard leave package for permanent and fixed-term employees.',
       'leave-policy-standard-' || entity_id,
       'leave-carry-over-standard-' || entity_id,
       TRUE
FROM entities
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT))
INSERT INTO public.leave_groups (
    id, entity_id, name, description, policy_id, carry_over_id, enabled
)
SELECT 'all-staff-' || entity_id, entity_id, 'All Staff',
       'Shared leave package available to every active employee.',
       'leave-policy-standard-' || entity_id,
       'leave-carry-over-standard-' || entity_id,
       TRUE
FROM entities
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT)),
items(leave_type_base_id) AS (
    VALUES
      ('annual-leave'), ('sick-leave'), ('hospitalisation-leave'),
      ('maternity-leave'), ('paternity-leave'), ('compassionate-leave'),
      ('unpaid-leave')
)
INSERT INTO public.leave_group_items (
    id, entity_id, group_id, leave_type_id, policy_id, carry_over_id, entitlement_days
)
SELECT 'full-time-standard-' || e.entity_id || '-' || i.leave_type_base_id,
       e.entity_id,
       'full-time-standard-' || e.entity_id,
       i.leave_type_base_id || '-' || e.entity_id,
       'leave-policy-standard-' || e.entity_id,
       'leave-carry-over-standard-' || e.entity_id,
       lt.default_entitlement_days
FROM entities e
CROSS JOIN items i
JOIN public.leave_types lt
  ON lt.id = i.leave_type_base_id || '-' || e.entity_id
ON CONFLICT (id) DO NOTHING;

WITH entities(entity_id) AS (VALUES ('ENT-92'::TEXT), ('ENT-86'::TEXT)),
items(leave_type_base_id) AS (
    VALUES
      ('sick-leave'), ('hospitalisation-leave'), ('compassionate-leave'),
      ('unpaid-leave')
)
INSERT INTO public.leave_group_items (
    id, entity_id, group_id, leave_type_id, policy_id, carry_over_id, entitlement_days
)
SELECT 'all-staff-' || e.entity_id || '-' || i.leave_type_base_id,
       e.entity_id,
       'all-staff-' || e.entity_id,
       i.leave_type_base_id || '-' || e.entity_id,
       'leave-policy-standard-' || e.entity_id,
       'leave-carry-over-standard-' || e.entity_id,
       lt.default_entitlement_days
FROM entities e
CROSS JOIN items i
JOIN public.leave_types lt
  ON lt.id = i.leave_type_base_id || '-' || e.entity_id
ON CONFLICT (id) DO NOTHING;
