-- Server-only password hash storage for the primary HRMS admin accounts.
-- The browser must never select public.users.password or public.users.password_hash.

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS nickname TEXT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE $comment$
      COMMENT ON COLUMN public.users.password IS
      'Legacy compatibility field. Do not expose to browser clients; migrate to password_hash.'
    $comment$;
  END IF;
END
$$;
