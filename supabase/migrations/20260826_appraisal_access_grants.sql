create table if not exists public.appraisal_access_grants (
  id text primary key default ('AAG-' || gen_random_uuid()::text),
  entity_id text not null,
  employee_id text not null,
  review_cycle_id text not null,
  status text not null default 'closed'
    check (status in ('closed', 'open', 'sent')),
  opened_at timestamptz,
  opened_by text,
  sent_at timestamptz,
  sent_by text,
  updated_at timestamptz not null default now(),
  constraint appraisal_access_grants_scope_key
    unique (entity_id, employee_id, review_cycle_id)
);

create index if not exists appraisal_access_grants_employee_cycle_idx
  on public.appraisal_access_grants (employee_id, review_cycle_id);

alter table public.appraisal_access_grants enable row level security;

drop policy if exists "appraisal access grants authenticated read" on public.appraisal_access_grants;
create policy "appraisal access grants authenticated read"
  on public.appraisal_access_grants for select
  to authenticated
  using (true);

drop policy if exists "appraisal access grants authenticated write" on public.appraisal_access_grants;
create policy "appraisal access grants authenticated write"
  on public.appraisal_access_grants for all
  to authenticated
  using (true)
  with check (true);
