-- Employee self-service requests, HR replies, notifications, and profile approvals.
-- These tables are written through the server API so employee and admin access
-- can be scoped independently from the legacy anonymous HRMS tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.employee_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    entity_id TEXT,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Normal'
        CHECK (priority IN ('Low', 'Normal', 'High')),
    status TEXT NOT NULL DEFAULT 'Open'
        CHECK (status IN ('Open', 'In Progress', 'Waiting for Employee', 'Resolved', 'Closed')),
    assigned_to TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_service_request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.employee_service_requests(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('employee', 'hr', 'system')),
    author_id TEXT,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_profile_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    change_type TEXT NOT NULL
        CHECK (change_type IN ('bank_details', 'statutory_details', 'identity_details', 'family_details')),
    current_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    request_id UUID REFERENCES public.employee_service_requests(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('service_request', 'profile_change', 'announcement')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_service_requests_employee_idx
    ON public.employee_service_requests (employee_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS employee_service_requests_queue_idx
    ON public.employee_service_requests (status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS employee_service_messages_request_idx
    ON public.employee_service_request_messages (request_id, created_at);
CREATE INDEX IF NOT EXISTS employee_profile_changes_employee_idx
    ON public.employee_profile_change_requests (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS employee_notifications_employee_idx
    ON public.employee_notifications (employee_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_employee_service_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_service_requests_updated_at ON public.employee_service_requests;
CREATE TRIGGER employee_service_requests_updated_at
    BEFORE UPDATE ON public.employee_service_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_service_updated_at();

DROP TRIGGER IF EXISTS employee_profile_change_requests_updated_at ON public.employee_profile_change_requests;
CREATE TRIGGER employee_profile_change_requests_updated_at
    BEFORE UPDATE ON public.employee_profile_change_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_service_updated_at();

ALTER TABLE public.employee_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_service_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.employee_service_requests FROM anon, authenticated;
REVOKE ALL ON public.employee_service_request_messages FROM anon, authenticated;
REVOKE ALL ON public.employee_profile_change_requests FROM anon, authenticated;
REVOKE ALL ON public.employee_notifications FROM anon, authenticated;
