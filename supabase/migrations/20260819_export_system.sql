CREATE TABLE IF NOT EXISTS public.export_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT,
  role TEXT,
  module TEXT NOT NULL,
  format TEXT NOT NULL,
  scope TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS export_audit_logs_created_at_idx
  ON public.export_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.export_field_definitions (
  module TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (module, field_key)
);

ALTER TABLE public.export_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_field_definitions ENABLE ROW LEVEL SECURITY;
