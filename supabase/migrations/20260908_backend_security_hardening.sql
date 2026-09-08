-- Backend security hardening for employee self-service workflows.
-- Employee and admin business writes should use the server-side service role.

ALTER TABLE IF EXISTS public.leave_requests
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leave_requests_employee_idempotency_idx
  ON public.leave_requests (employee_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE IF EXISTS public.employee_service_requests
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS employee_service_requests_employee_idempotency_idx
  ON public.employee_service_requests (employee_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE IF EXISTS public.employee_service_request_messages
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS employee_service_messages_request_idempotency_idx
  ON public.employee_service_request_messages (request_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE IF EXISTS public.employee_profile_change_requests
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS employee_profile_change_employee_idempotency_idx
  ON public.employee_profile_change_requests (employee_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE IF EXISTS public.employee_profile_change_requests
  DROP CONSTRAINT IF EXISTS employee_profile_change_requests_status_check;

ALTER TABLE IF EXISTS public.employee_profile_change_requests
  ADD CONSTRAINT employee_profile_change_requests_status_check
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Failed'));

ALTER TABLE IF EXISTS public.email_otp_challenges
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS device_hash TEXT;

CREATE INDEX IF NOT EXISTS email_otp_challenges_ip_idx
  ON public.email_otp_challenges (ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  employee_id TEXT,
  request_id UUID REFERENCES public.employee_service_requests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('portal', 'email')),
  recipient TEXT,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
  ON public.notification_outbox (status, available_at);

CREATE TABLE IF NOT EXISTS public.employee_account_action_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_account_action_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_account_action_idempotency FROM anon, authenticated;

ALTER TABLE IF EXISTS public.employee_notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS employee_notifications_idempotency_idx
  ON public.employee_notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS notification_outbox_updated_at ON public.notification_outbox;
CREATE OR REPLACE FUNCTION public.set_notification_outbox_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notification_outbox_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_outbox_updated_at();

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_employee_service_request_with_message(
  p_employee_id TEXT,
  p_employee_email TEXT,
  p_employee_name TEXT,
  p_entity_id TEXT,
  p_category TEXT,
  p_subject TEXT,
  p_description TEXT,
  p_priority TEXT,
  p_idempotency_key TEXT
)
RETURNS SETOF public.employee_service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.employee_service_requests;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT *
      INTO request_row
      FROM public.employee_service_requests
     WHERE employee_id = p_employee_id
       AND idempotency_key = p_idempotency_key
     LIMIT 1;

    IF request_row.id IS NOT NULL THEN
      RETURN NEXT request_row;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.employee_service_requests (
    employee_id,
    employee_email,
    employee_name,
    entity_id,
    category,
    subject,
    description,
    priority,
    status,
    idempotency_key
  )
  VALUES (
    p_employee_id,
    p_employee_email,
    p_employee_name,
    p_entity_id,
    p_category,
    p_subject,
    p_description,
    p_priority,
    'Open',
    p_idempotency_key
  )
  RETURNING * INTO request_row;

  INSERT INTO public.employee_service_request_messages (
    request_id,
    author_type,
    author_id,
    author_name,
    body,
    idempotency_key
  )
  VALUES (
    request_row.id,
    'employee',
    p_employee_id,
    p_employee_name,
    p_description,
    'initial:' || COALESCE(p_idempotency_key, request_row.id::TEXT)
  );

  INSERT INTO public.notification_outbox (
    event_key,
    employee_id,
    request_id,
    channel,
    recipient,
    template,
    payload
  )
  VALUES (
    'employee-request-created:' || request_row.id::TEXT,
    p_employee_id,
    request_row.id,
    'email',
    'hr@redpoint.com.my',
    'employee_request_created',
    jsonb_build_object(
      'name', p_employee_name,
      'subject', p_subject,
      'category', p_category,
      'priority', p_priority,
      'details', p_description
    )
  )
  ON CONFLICT (event_key) DO NOTHING;

  RETURN NEXT request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_leave_request(
  p_id TEXT,
  p_entity_id TEXT,
  p_employee_id TEXT,
  p_employee_name TEXT,
  p_leave_type_id TEXT,
  p_leave_type TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_total_days NUMERIC,
  p_reason TEXT,
  p_applied_date DATE,
  p_idempotency_key TEXT
)
RETURNS SETOF public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.leave_requests;
  configured_type public.leave_types;
  configured_policy public.leave_condition_policies;
  calculated_days NUMERIC(8, 2);
BEGIN
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Invalid leave date range';
  END IF;

  -- Serialize leave reservations for one employee so concurrent submissions
  -- cannot both pass overlap and entitlement checks.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(COALESCE(p_entity_id, '') || ':' || COALESCE(p_employee_id, ''), 0)
  );

  IF p_idempotency_key IS NOT NULL THEN
    SELECT *
      INTO request_row
      FROM public.leave_requests
     WHERE employee_id = p_employee_id
       AND idempotency_key = p_idempotency_key
     LIMIT 1;

    IF request_row.id IS NOT NULL THEN
      RETURN NEXT request_row;
      RETURN;
    END IF;
  END IF;

  SELECT *
    INTO configured_type
    FROM public.leave_types
   WHERE id = p_leave_type_id
     AND entity_id = p_entity_id
     AND enabled = TRUE
   LIMIT 1;

  IF configured_type.id IS NULL OR configured_type.name <> p_leave_type THEN
    RAISE EXCEPTION 'The selected leave type is not available for this employee';
  END IF;

  IF configured_type.policy_id IS NOT NULL THEN
    SELECT *
      INTO configured_policy
      FROM public.leave_condition_policies
     WHERE id = configured_type.policy_id
       AND entity_id = p_entity_id
       AND enabled = TRUE
     LIMIT 1;
  END IF;

  SELECT COUNT(*)::NUMERIC
    INTO calculated_days
    FROM generate_series(p_start_date, p_end_date, INTERVAL '1 day') AS dates(day)
   WHERE (
     COALESCE(configured_policy.exclude_weekends, TRUE) = FALSE
     OR EXTRACT(ISODOW FROM dates.day) NOT IN (6, 7)
   )
   AND (
     COALESCE(configured_policy.exclude_public_holidays, TRUE) = FALSE
     OR NOT EXISTS (
       SELECT 1
         FROM public.public_holidays holiday
        WHERE holiday.entity_id = p_entity_id
          AND holiday.enabled = TRUE
          AND dates.day::DATE IN (holiday.holiday_date, holiday.observed_date)
     )
   );

  IF calculated_days <= 0 THEN
    RAISE EXCEPTION 'The selected dates do not produce any eligible leave days';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.leave_requests
     WHERE employee_id = p_employee_id
       AND status IN ('Pending', 'Approved')
       AND daterange(start_date, end_date, '[]')
           && daterange(p_start_date, p_end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'The selected dates overlap an existing leave request';
  END IF;

  IF LOWER(COALESCE(configured_policy.paid_treatment, configured_type.condition, 'paid')) NOT LIKE '%unpaid%'
     AND configured_type.default_entitlement_days > 0
     AND (
       COALESCE((
         SELECT SUM(total_days)
           FROM public.leave_requests
          WHERE employee_id = p_employee_id
            AND leave_type_id = p_leave_type_id
            AND status IN ('Pending', 'Approved')
       ), 0) + calculated_days
     ) > configured_type.default_entitlement_days THEN
    RAISE EXCEPTION 'The selected dates exceed the available leave entitlement';
  END IF;

  INSERT INTO public.leave_requests (
    id,
    entity_id,
    employee_id,
    employee_name,
    leave_type_id,
    leave_type,
    start_date,
    end_date,
    total_days,
    reason,
    status,
    applied_date,
    idempotency_key
  )
  VALUES (
    p_id,
    p_entity_id,
    p_employee_id,
    p_employee_name,
    p_leave_type_id,
    p_leave_type,
    p_start_date,
    p_end_date,
    calculated_days,
    p_reason,
    'Pending',
    p_applied_date,
    p_idempotency_key
  )
  RETURNING * INTO request_row;

  RETURN NEXT request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_profile_change_workflow(
  p_request_id UUID,
  p_status TEXT,
  p_reviewed_by TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS SETOF public.employee_profile_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_row public.employee_profile_change_requests;
  employee_exists BOOLEAN;
BEGIN
  SELECT *
    INTO change_row
    FROM public.employee_profile_change_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF change_row.id IS NULL THEN
    RAISE EXCEPTION 'Profile change request was not found';
  END IF;
  IF change_row.status NOT IN ('Pending', 'Failed') THEN
    RAISE EXCEPTION 'This profile change request has already been reviewed';
  END IF;
  IF p_status NOT IN ('Approved', 'Rejected') THEN
    RAISE EXCEPTION 'Invalid profile change decision';
  END IF;

  IF p_status = 'Rejected' THEN
    UPDATE public.employee_profile_change_requests
       SET status = 'Rejected',
           reviewed_by = p_reviewed_by,
           reviewed_at = NOW(),
           review_note = NULLIF(p_review_note, '')
     WHERE id = p_request_id
     RETURNING * INTO change_row;
    RETURN NEXT change_row;
    RETURN;
  END IF;

  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = $1)'
      INTO employee_exists
      USING change_row.employee_id;

    IF NOT employee_exists THEN
      RAISE EXCEPTION 'Employee profile was not found';
    END IF;

    IF change_row.change_type = 'bank_details' THEN
      EXECUTE 'UPDATE public.employees
                  SET bank_name = CASE WHEN $1 ? ''bankName'' THEN $1->>''bankName'' ELSE bank_name END,
                      account_no = CASE WHEN $1 ? ''accountNo'' THEN $1->>''accountNo'' ELSE account_no END
                WHERE id = $2'
        USING change_row.requested_values, change_row.employee_id;
    ELSIF change_row.change_type = 'statutory_details' THEN
      EXECUTE 'UPDATE public.employees
                  SET tax_number = CASE WHEN $1 ? ''taxNumber'' THEN $1->>''taxNumber'' ELSE tax_number END,
                      epf_number = CASE WHEN $1 ? ''epfNumber'' THEN $1->>''epfNumber'' ELSE epf_number END
                WHERE id = $2'
        USING change_row.requested_values, change_row.employee_id;
    ELSIF change_row.change_type = 'identity_details' THEN
      EXECUTE 'UPDATE public.employees
                  SET nric_passport = CASE WHEN $1 ? ''nricPassport'' THEN $1->>''nricPassport'' ELSE nric_passport END,
                      nationality = CASE WHEN $1 ? ''nationality'' THEN $1->>''nationality'' ELSE nationality END
                WHERE id = $2'
        USING change_row.requested_values, change_row.employee_id;
    ELSIF change_row.change_type = 'family_details' THEN
      EXECUTE 'UPDATE public.employees
                  SET marital_status = CASE WHEN $1 ? ''maritalStatus'' THEN $1->>''maritalStatus'' ELSE marital_status END,
                      spouse_name = CASE WHEN $1 ? ''spouseName'' THEN $1->>''spouseName'' ELSE spouse_name END,
                      spouse_nric = CASE WHEN $1 ? ''spouseNric'' THEN $1->>''spouseNric'' ELSE spouse_nric END,
                      spouse_is_working = CASE WHEN $1 ? ''spouseIsWorking'' THEN $1->>''spouseIsWorking'' ELSE spouse_is_working END,
                      spouse_company = CASE WHEN $1 ? ''spouseCompany'' THEN $1->>''spouseCompany'' ELSE spouse_company END,
                      spouse_position = CASE WHEN $1 ? ''spousePosition'' THEN $1->>''spousePosition'' ELSE spouse_position END,
                      has_dependants = CASE WHEN $1 ? ''hasDependants'' THEN $1->>''hasDependants'' ELSE has_dependants END,
                      dependants = CASE WHEN $1 ? ''dependants'' THEN $1->''dependants'' ELSE dependants END
                WHERE id = $2'
        USING change_row.requested_values, change_row.employee_id;
    ELSE
      RAISE EXCEPTION 'Unsupported profile change type';
    END IF;

    EXECUTE 'INSERT INTO public.audit_logs
      (id, employee_email, changed_by, change_type, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)'
      USING
        'profile-change-' || p_request_id::TEXT || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        change_row.employee_email,
        p_reviewed_by,
        'EMPLOYEE_PROFILE_CHANGE_APPROVED',
        change_row.current_values::TEXT,
        change_row.requested_values::TEXT;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.employee_profile_change_requests
       SET status = 'Failed',
           reviewed_by = p_reviewed_by,
           reviewed_at = NOW(),
           review_note = COALESCE(NULLIF(p_review_note, ''), SQLERRM)
     WHERE id = p_request_id
     RETURNING * INTO change_row;
    RETURN NEXT change_row;
    RETURN;
  END;

  UPDATE public.employee_profile_change_requests
     SET status = 'Approved',
         reviewed_by = p_reviewed_by,
         reviewed_at = NOW(),
         review_note = NULLIF(p_review_note, '')
   WHERE id = p_request_id
   RETURNING * INTO change_row;

  RETURN NEXT change_row;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_profile_change_workflow(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_employee_service_request_with_message(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_leave_request(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT, DATE, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_profile_change_workflow(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Remove the historical anonymous full-table policies from sensitive business
-- tables. Server-side service-role APIs remain the only application write path.
DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employees',
    'payroll_records_2026',
    'performances',
    'leave_types',
    'leave_condition_policies',
    'leave_carryover_settings',
    'leave_groups',
    'leave_group_items',
    'employee_leave_group_assignments',
    'leave_requests',
    'off_in_lieu_requests',
    'off_in_lieu_entries',
    'leave_balance_ledger',
    'leave_payroll_deductions',
    'work_shift_groups',
    'work_shift_group_days',
    'employee_work_shift_assignments',
    'public_holidays',
    'public_holiday_groups'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', table_name);
    BEGIN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
    FOR policy_name IN
      SELECT policyname
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = table_name
         AND (
           array_to_string(roles, ',') ILIKE '%public%'
           OR array_to_string(roles, ',') ILIKE '%anon%'
           OR COALESCE(qual, '') ILIKE '%true%'
           OR COALESCE(with_check, '') ILIKE '%true%'
         )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END
$$;

-- HR documents contain identity and payroll material and must not be public.
UPDATE storage.buckets
   SET public = FALSE
 WHERE id = 'hr-documents';

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND (
         COALESCE(qual, '') ILIKE '%hr-documents%'
         OR COALESCE(with_check, '') ILIKE '%hr-documents%'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.create_employee_service_request_with_message(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_leave_request(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT, DATE, TEXT
) FROM PUBLIC;
