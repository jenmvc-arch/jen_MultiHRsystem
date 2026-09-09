-- Add an optional per-leave-type attachment requirement.
-- Existing leave types remain optional for backwards compatibility.

ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS requires_attachment BOOLEAN NOT NULL DEFAULT FALSE;
