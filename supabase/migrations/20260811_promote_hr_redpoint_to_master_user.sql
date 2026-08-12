-- Promote the HR admin account to the full admin-console role.
UPDATE public.users
SET role = 'Master User'
WHERE LOWER(email) = 'hr.redpoint';
