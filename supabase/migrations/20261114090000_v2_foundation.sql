begin;

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120)
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'evaluator', 'viewer')),
  primary key (organisation_id, user_id)
);

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  idempotency_key text not null,
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (organisation_id, idempotency_key),
  check (expires_at > created_at)
);

create index evaluation_runs_org_created on public.evaluation_runs(organisation_id, created_at desc);
create index evaluation_runs_expiry on public.evaluation_runs(expires_at);

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.evaluation_runs enable row level security;

revoke all on public.organisations, public.organisation_members, public.evaluation_runs from anon, authenticated;
grant select on public.organisations, public.organisation_members, public.evaluation_runs to authenticated;

create policy own_memberships on public.organisation_members
  for select to authenticated using (user_id = (select auth.uid()));
create policy member_organisation on public.organisations
  for select to authenticated using (exists (
    select 1 from public.organisation_members m where m.organisation_id = organisations.id
  ));
create policy member_runs on public.evaluation_runs
  for select to authenticated using (expires_at > now() and exists (
    select 1 from public.organisation_members m where m.organisation_id = evaluation_runs.organisation_id
  ));

commit;
