-- Persist employee-specific payroll document visibility settings.
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS payroll_document_display_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
