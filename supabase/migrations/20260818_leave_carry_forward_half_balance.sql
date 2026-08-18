-- Add the 50% prior-year carry-forward rule.
-- Apply this migration to the employee Supabase project.

ALTER TABLE public.leave_carryover_settings
  DROP CONSTRAINT IF EXISTS leave_carryover_settings_carry_forward_rule_check;

ALTER TABLE public.leave_carryover_settings
  ADD CONSTRAINT leave_carryover_settings_carry_forward_rule_check
  CHECK (carry_forward_rule IN ('none', 'full_balance', 'half_balance', 'capped'));
