-- Secure employee account metadata and delivery audit records.
-- Apply this migration to the employee portal Supabase project.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.employee_accounts (
    employee_id TEXT PRIMARY KEY,
    employee_email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    account_status TEXT NOT NULL DEFAULT 'not_created'
        CHECK (account_status IN (
            'not_created',
            'invited',
            'active',
            'must_change_password',
            'disabled',
            'error'
        )),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    last_invited_at TIMESTAMPTZ,
    last_password_reset_at TIMESTAMPTZ,
    last_delivery_channel TEXT
        CHECK (last_delivery_channel IN ('email', 'whatsapp', 'both')),
    last_delivery_status TEXT
        CHECK (last_delivery_status IN ('sent', 'queued', 'handoff', 'failed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_account_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    actor_username TEXT NOT NULL,
    action TEXT NOT NULL
        CHECK (action IN ('provision', 'share', 'reset_password')),
    channel TEXT
        CHECK (channel IN ('email', 'whatsapp', 'both')),
    provider TEXT,
    result TEXT NOT NULL
        CHECK (result IN ('sent', 'queued', 'handoff', 'failed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_account_events_employee_idx
    ON public.employee_account_events (employee_id, created_at DESC);

ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_account_events ENABLE ROW LEVEL SECURITY;

-- These tables are intentionally service-role-only. The browser must use the
-- server API so account state and delivery events cannot be forged client-side.
REVOKE ALL ON public.employee_accounts FROM anon, authenticated;
REVOKE ALL ON public.employee_account_events FROM anon, authenticated;
