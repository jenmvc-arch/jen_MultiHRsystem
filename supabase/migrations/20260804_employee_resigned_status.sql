-- Persist effective-dated employee separation details used by payroll.
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS date_of_termination DATE;

COMMENT ON COLUMN public.employees.date_of_termination IS
    'Effective termination or resignation date used for payroll proration.';
