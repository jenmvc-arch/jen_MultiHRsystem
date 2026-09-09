-- Entity-scoped, versioned email templates for employer notifications.
CREATE TABLE IF NOT EXISTS public.email_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id TEXT REFERENCES public.corporate_entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assigned_function TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_templates_lookup_idx
  ON public.email_templates (entity_id, assigned_function, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS email_templates_one_active_scope_idx
  ON public.email_templates (COALESCE(entity_id, 'GLOBAL'), assigned_function)
  WHERE is_active = TRUE;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_templates FROM anon, authenticated;
