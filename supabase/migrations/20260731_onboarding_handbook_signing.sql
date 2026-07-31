-- Private, versioned handbook signing and archive records.
-- Run this migration after Supabase Auth is enabled for employee signers.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.handbook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id TEXT REFERENCES public.corporate_entities(id) ON DELETE SET NULL,
    version TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    page_count INTEGER NOT NULL CHECK (page_count > 0),
    sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    coordinate_map JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS handbook_templates_one_active_per_entity
    ON public.handbook_templates (COALESCE(entity_id, 'GLOBAL'))
    WHERE is_active;

CREATE UNIQUE INDEX IF NOT EXISTS handbook_templates_entity_version_unique
    ON public.handbook_templates (COALESCE(entity_id, 'GLOBAL'), version);

CREATE TABLE IF NOT EXISTS public.onboarding_signing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('employee', 'candidate')),
    subject_id TEXT NOT NULL,
    subject_email TEXT NOT NULL,
    signer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    template_id UUID NOT NULL REFERENCES public.handbook_templates(id) ON DELETE RESTRICT,
    revision INTEGER NOT NULL CHECK (revision > 0),
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'finalizing', 'finalized', 'superseded')),
    quiz_score_percent NUMERIC(5, 2),
    quiz_grade TEXT,
    quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
    final_pdf_path TEXT,
    final_pdf_sha256 TEXT CHECK (
        final_pdf_sha256 IS NULL OR final_pdf_sha256 ~ '^[a-f0-9]{64}$'
    ),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, subject_type, subject_id, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_one_open_session_per_subject
    ON public.onboarding_signing_sessions (template_id, subject_type, subject_id)
    WHERE status IN ('in_progress', 'finalizing');

CREATE TABLE IF NOT EXISTS public.onboarding_signature_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES public.onboarding_signing_sessions(id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 15),
    mark_type TEXT NOT NULL CHECK (mark_type IN ('initial', 'final_signature')),
    image_path TEXT NOT NULL UNIQUE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (part_number BETWEEN 1 AND 14 AND mark_type = 'initial')
        OR (part_number = 15 AND mark_type = 'final_signature')
    ),
    UNIQUE (session_id, part_number)
);

ALTER TABLE public.handbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_signing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_signature_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active handbook templates"
    ON public.handbook_templates
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

CREATE POLICY "Signers can read own handbook sessions"
    ON public.onboarding_signing_sessions
    FOR SELECT
    TO authenticated
    USING (signer_user_id = auth.uid());

CREATE POLICY "Signers can read own handbook marks"
    ON public.onboarding_signature_marks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.onboarding_signing_sessions session
            WHERE session.id = onboarding_signature_marks.session_id
              AND session.signer_user_id = auth.uid()
        )
    );

CREATE POLICY "Signers can delete marks from own open session"
    ON public.onboarding_signature_marks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.onboarding_signing_sessions session
            WHERE session.id = onboarding_signature_marks.session_id
              AND session.signer_user_id = auth.uid()
              AND session.status = 'in_progress'
        )
    );

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('handbook-templates', 'handbook-templates', FALSE),
    ('onboarding-signatures', 'onboarding-signatures', FALSE),
    ('signed-handbooks', 'signed-handbooks', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

CREATE POLICY "Signers can read own signature images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'onboarding-signatures'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Signers can upload own signature images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'onboarding-signatures'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Signers can replace own signature images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'onboarding-signatures'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    )
    WITH CHECK (
        bucket_id = 'onboarding-signatures'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Signers can remove own signature images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'onboarding-signatures'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Signers can read own finalized handbooks"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'signed-handbooks'
        AND EXISTS (
            SELECT 1
            FROM public.onboarding_signing_sessions session
            WHERE session.final_pdf_path = storage.objects.name
              AND session.signer_user_id = auth.uid()
              AND session.status = 'finalized'
        )
    );

CREATE OR REPLACE FUNCTION public.create_or_resume_handbook_session(
    p_subject_type TEXT,
    p_subject_id TEXT,
    p_subject_email TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_template_version TEXT DEFAULT NULL,
    p_start_new_revision BOOLEAN DEFAULT FALSE
)
RETURNS public.onboarding_signing_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_template public.handbook_templates;
    existing_session public.onboarding_signing_sessions;
    next_revision INTEGER;
    jwt_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    jwt_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
    IF jwt_email = '' OR jwt_email <> LOWER(TRIM(p_subject_email)) THEN
        RAISE EXCEPTION 'Authenticated email does not match the signing subject.';
    END IF;

    IF p_subject_type NOT IN ('employee', 'candidate') THEN
        RAISE EXCEPTION 'Invalid signing subject type.';
    END IF;

    IF p_subject_type = 'employee' AND NOT EXISTS (
        SELECT 1
        FROM public.employees employee
        WHERE employee.id = p_subject_id
          AND LOWER(employee.email) = jwt_email
          AND (p_entity_id IS NULL OR employee.entity_id = p_entity_id)
    ) THEN
        RAISE EXCEPTION 'The authenticated employee record does not match the signing subject.';
    END IF;

    IF p_subject_type = 'candidate' AND NOT EXISTS (
        SELECT 1
        FROM public.candidates candidate
        WHERE candidate.id = p_subject_id
          AND LOWER(candidate.email) = jwt_email
          AND (p_entity_id IS NULL OR candidate.entity_id = p_entity_id)
    ) THEN
        RAISE EXCEPTION 'The authenticated candidate record does not match the signing subject.';
    END IF;

    SELECT *
    INTO active_template
    FROM public.handbook_templates template
    WHERE template.is_active = TRUE
      AND (
          template.entity_id = p_entity_id
          OR template.entity_id IS NULL
      )
      AND (p_template_version IS NULL OR template.version = p_template_version)
    ORDER BY
        (template.entity_id = p_entity_id) DESC NULLS LAST,
        template.created_at DESC
    LIMIT 1;

    IF active_template.id IS NULL THEN
        RAISE EXCEPTION 'No active handbook template is configured.';
    END IF;

    SELECT *
    INTO existing_session
    FROM public.onboarding_signing_sessions session
    WHERE session.template_id = active_template.id
      AND session.subject_type = p_subject_type
      AND session.subject_id = p_subject_id
      AND session.signer_user_id = auth.uid()
      AND session.status = 'in_progress'
    LIMIT 1;

    IF existing_session.id IS NOT NULL THEN
        RETURN existing_session;
    END IF;

    IF NOT p_start_new_revision THEN
        SELECT *
        INTO existing_session
        FROM public.onboarding_signing_sessions session
        WHERE session.template_id = active_template.id
          AND session.subject_type = p_subject_type
          AND session.subject_id = p_subject_id
          AND session.signer_user_id = auth.uid()
          AND session.status = 'finalized'
        ORDER BY session.revision DESC
        LIMIT 1;

        IF existing_session.id IS NOT NULL THEN
            RETURN existing_session;
        END IF;
    END IF;

    SELECT COALESCE(MAX(session.revision), 0) + 1
    INTO next_revision
    FROM public.onboarding_signing_sessions session
    WHERE session.template_id = active_template.id
      AND session.subject_type = p_subject_type
      AND session.subject_id = p_subject_id;

    INSERT INTO public.onboarding_signing_sessions (
        subject_type,
        subject_id,
        subject_email,
        signer_user_id,
        template_id,
        revision
    )
    VALUES (
        p_subject_type,
        p_subject_id,
        LOWER(TRIM(p_subject_email)),
        auth.uid(),
        active_template.id,
        next_revision
    )
    RETURNING * INTO existing_session;

    RETURN existing_session;
END;
$$;

REVOKE ALL ON FUNCTION public.create_or_resume_handbook_session(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_or_resume_handbook_session(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.record_handbook_mark(
    p_session_id UUID,
    p_part_number INTEGER,
    p_mark_type TEXT,
    p_image_path TEXT
)
RETURNS public.onboarding_signature_marks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    signing_session public.onboarding_signing_sessions;
    saved_mark public.onboarding_signature_marks;
BEGIN
    SELECT *
    INTO signing_session
    FROM public.onboarding_signing_sessions session
    WHERE session.id = p_session_id
      AND session.signer_user_id = auth.uid()
      AND session.status = 'in_progress';

    IF signing_session.id IS NULL THEN
        RAISE EXCEPTION 'The signing session is unavailable or locked.';
    END IF;

    IF NOT (
        (p_part_number BETWEEN 1 AND 14 AND p_mark_type = 'initial')
        OR (p_part_number = 15 AND p_mark_type = 'final_signature')
    ) THEN
        RAISE EXCEPTION 'Invalid handbook signature mark.';
    END IF;

    IF (storage.foldername(p_image_path))[1] <> auth.uid()::TEXT
       OR (storage.foldername(p_image_path))[2] <> p_session_id::TEXT THEN
        RAISE EXCEPTION 'Signature image path does not belong to the signer.';
    END IF;

    INSERT INTO public.onboarding_signature_marks (
        session_id,
        part_number,
        mark_type,
        image_path,
        captured_at,
        updated_at
    )
    VALUES (
        p_session_id,
        p_part_number,
        p_mark_type,
        p_image_path,
        NOW(),
        NOW()
    )
    ON CONFLICT (session_id, part_number)
    DO UPDATE SET
        mark_type = EXCLUDED.mark_type,
        image_path = EXCLUDED.image_path,
        captured_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO saved_mark;

    RETURN saved_mark;
END;
$$;

REVOKE ALL ON FUNCTION public.record_handbook_mark(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_handbook_mark(UUID, INTEGER, TEXT, TEXT)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.record_handbook_quiz_result(
    p_session_id UUID,
    p_score_percent NUMERIC,
    p_grade TEXT
)
RETURNS public.onboarding_signing_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_session public.onboarding_signing_sessions;
BEGIN
    IF p_score_percent < 0 OR p_score_percent > 100 THEN
        RAISE EXCEPTION 'Quiz score must be between 0 and 100.';
    END IF;

    UPDATE public.onboarding_signing_sessions session
    SET
        quiz_score_percent = p_score_percent,
        quiz_grade = p_grade,
        quiz_passed = p_score_percent >= 65,
        updated_at = NOW()
    WHERE session.id = p_session_id
      AND session.signer_user_id = auth.uid()
      AND session.status = 'in_progress'
    RETURNING * INTO updated_session;

    IF updated_session.id IS NULL THEN
        RAISE EXCEPTION 'The signing session is unavailable or locked.';
    END IF;

    RETURN updated_session;
END;
$$;

REVOKE ALL ON FUNCTION public.record_handbook_quiz_result(UUID, NUMERIC, TEXT)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_handbook_quiz_result(UUID, NUMERIC, TEXT)
    TO authenticated;
