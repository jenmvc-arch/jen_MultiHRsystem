-- Work/shift groups and configurable Malaysian public holidays for Leave Management.

CREATE TABLE IF NOT EXISTS public.work_shift_groups (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    weekly_hours_warning BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, name)
);

CREATE TABLE IF NOT EXISTS public.work_shift_group_days (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES public.work_shift_groups(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    day_type TEXT NOT NULL DEFAULT 'rest'
        CHECK (day_type IN ('full_day', 'half_day', 'rest')),
    is_work_day BOOLEAN NOT NULL DEFAULT FALSE,
    actual_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, weekday)
);

CREATE TABLE IF NOT EXISTS public.employee_work_shift_assignments (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES public.work_shift_groups(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, group_id, effective_date)
);

CREATE TABLE IF NOT EXISTS public.public_holiday_groups (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('national', 'state')),
    state_code TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, name)
);

CREATE TABLE IF NOT EXISTS public.public_holidays (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    group_id TEXT NOT NULL REFERENCES public.public_holiday_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    observed_date DATE,
    year INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leave_groups
    ADD COLUMN IF NOT EXISTS public_holiday_group_ids JSONB NOT NULL DEFAULT '["public-holiday-malaysia-national"]'::jsonb;

CREATE INDEX IF NOT EXISTS work_shift_groups_entity_idx
    ON public.work_shift_groups(entity_id, enabled);
CREATE INDEX IF NOT EXISTS work_shift_days_group_idx
    ON public.work_shift_group_days(entity_id, group_id, weekday);
CREATE INDEX IF NOT EXISTS work_shift_assignments_employee_idx
    ON public.employee_work_shift_assignments(entity_id, employee_id, active, effective_date);
CREATE INDEX IF NOT EXISTS public_holiday_groups_entity_idx
    ON public.public_holiday_groups(entity_id, category, enabled);
CREATE INDEX IF NOT EXISTS public_holidays_group_date_idx
    ON public.public_holidays(entity_id, group_id, holiday_date, enabled);

CREATE OR REPLACE FUNCTION public.set_work_shift_public_holiday_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_shift_groups_updated_at ON public.work_shift_groups;
CREATE TRIGGER work_shift_groups_updated_at
BEFORE UPDATE ON public.work_shift_groups
FOR EACH ROW EXECUTE FUNCTION public.set_work_shift_public_holiday_updated_at();

DROP TRIGGER IF EXISTS work_shift_group_days_updated_at ON public.work_shift_group_days;
CREATE TRIGGER work_shift_group_days_updated_at
BEFORE UPDATE ON public.work_shift_group_days
FOR EACH ROW EXECUTE FUNCTION public.set_work_shift_public_holiday_updated_at();

DROP TRIGGER IF EXISTS public_holiday_groups_updated_at ON public.public_holiday_groups;
CREATE TRIGGER public_holiday_groups_updated_at
BEFORE UPDATE ON public.public_holiday_groups
FOR EACH ROW EXECUTE FUNCTION public.set_work_shift_public_holiday_updated_at();

DROP TRIGGER IF EXISTS public_holidays_updated_at ON public.public_holidays;
CREATE TRIGGER public_holidays_updated_at
BEFORE UPDATE ON public.public_holidays
FOR EACH ROW EXECUTE FUNCTION public.set_work_shift_public_holiday_updated_at();

ALTER TABLE public.work_shift_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_shift_group_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holiday_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'work_shift_groups',
        'work_shift_group_days',
        'employee_work_shift_assignments',
        'public_holiday_groups',
        'public_holidays'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Leave app access" ON public.%I', table_name);
        EXECUTE format('CREATE POLICY "Leave app access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name);
    END LOOP;
END
$$;

