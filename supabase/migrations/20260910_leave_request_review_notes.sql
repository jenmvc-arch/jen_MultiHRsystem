-- Store the employer's approval or rejection note on each leave request.
ALTER TABLE IF EXISTS public.leave_requests
  ADD COLUMN IF NOT EXISTS review_note TEXT;
