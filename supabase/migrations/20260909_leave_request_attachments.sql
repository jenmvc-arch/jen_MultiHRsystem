-- Allow employee leave requests to reference a protected supporting document.
-- The binary file stays in the existing hr-documents storage bucket.

ALTER TABLE IF EXISTS public.leave_requests
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

ALTER TABLE IF EXISTS public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_attachment_type_check;

ALTER TABLE IF EXISTS public.leave_requests
  ADD CONSTRAINT leave_requests_attachment_type_check
  CHECK (
    attachment_type IS NULL
    OR attachment_type IN ('image/jpeg', 'image/png', 'application/pdf')
  );
