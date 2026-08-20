-- Store optional admin notes for Off in Lieu requests.
ALTER TABLE public.off_in_lieu_requests
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
