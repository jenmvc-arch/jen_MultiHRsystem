-- Add the per-leave-type carry-forward switch.
-- Apply this migration to the employee Supabase project.

ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS can_carry_over BOOLEAN NOT NULL DEFAULT TRUE;
