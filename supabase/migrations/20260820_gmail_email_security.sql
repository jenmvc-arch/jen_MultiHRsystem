-- Server-only OTP and Gmail delivery records for the employee/Auth project.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.email_otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('login', 'password_reset', 'activation')),
    expires_at TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    request_count_window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INTEGER NOT NULL DEFAULT 1,
    verification_attempts INTEGER NOT NULL DEFAULT 0,
    max_verification_attempts INTEGER NOT NULL DEFAULT 5,
    verified_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_otp_challenges_email_idx
  ON public.email_otp_challenges (email, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    sent_at TIMESTAMPTZ,
    provider_message_id TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_delivery_logs_recipient_idx
  ON public.email_delivery_logs (recipient, created_at DESC);

ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_otp_challenges FROM anon, authenticated;
REVOKE ALL ON public.email_delivery_logs FROM anon, authenticated;
