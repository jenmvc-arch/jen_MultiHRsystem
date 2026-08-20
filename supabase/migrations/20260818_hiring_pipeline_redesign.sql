CREATE TABLE IF NOT EXISTS public.candidate_pipeline_history (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  notes TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidate_interviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  meeting_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  evaluators JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_score NUMERIC NOT NULL DEFAULT 0,
  communication_score NUMERIC NOT NULL DEFAULT 0,
  cultural_fit_score NUMERIC NOT NULL DEFAULT 0,
  leadership_score NUMERIC NOT NULL DEFAULT 0,
  overall_recommendation TEXT NOT NULL DEFAULT 'Hold',
  additional_comments TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidate_offers (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offer_preparing',
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_notes TEXT NOT NULL DEFAULT '',
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.candidate_share_links (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('interview', 'onboarding')),
  token TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invalidated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.candidate_share_deliveries (
  id TEXT PRIMARY KEY,
  share_link_id TEXT NOT NULL REFERENCES public.candidate_share_links(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('copy', 'share', 'email', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('handoff', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS candidate_pipeline_history_candidate_idx
  ON public.candidate_pipeline_history(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS candidate_interviews_candidate_idx
  ON public.candidate_interviews(candidate_id, scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS candidate_share_links_token_idx
  ON public.candidate_share_links(token);

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS pipeline_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kiv_notes TEXT,
  ADD COLUMN IF NOT EXISTS kiv_follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
