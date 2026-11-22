-- Lentera schema: profiles with roles, cohorts, students, predictions, interventions, plans, request log.
-- Users only read through RLS; the API writes scored data with the secret (service role) key, which bypasses RLS.

create type public.app_role as enum ('advisor', 'coordinator', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'advisor',
  modules text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Role and modules come from app_metadata, which only the secret key can set.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role, modules)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'advisor'),
    coalesce(array(select jsonb_array_elements_text(new.raw_app_meta_data -> 'modules')), '{}')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Security definer helpers keep RLS policies from querying profiles recursively.
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.can_see_module(module text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or module = any(p.modules))
  )
$$;

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uploaded_by uuid references public.profiles on delete set null,
  uploaded_at timestamptz not null default now(),
  storage_path text,
  n_rows integer not null default 0,
  model_version text not null,
  status text not null check (status in ('scored', 'failed')),
  quality_report jsonb not null default '{}',
  drift_report jsonb
);

create table public.students (
  id bigint generated always as identity primary key,
  cohort_id uuid not null references public.cohorts on delete cascade,
  source_id integer not null,
  code_module text not null,
  code_presentation text not null,
  raw jsonb not null,
  unique (cohort_id, source_id)
);
create index students_cohort_module on public.students (cohort_id, code_module);

-- cohort_id and code_module are copied from students so RLS and dashboard queries need no join.
create table public.predictions (
  student_id bigint primary key references public.students on delete cascade,
  cohort_id uuid not null references public.cohorts on delete cascade,
  code_module text not null,
  model_version text not null,
  probability double precision not null check (probability between 0 and 1),
  flagged boolean not null,
  tier text not null check (tier in ('low', 'watch', 'high', 'critical')),
  uncertain boolean not null,
  archetype text not null check (archetype in ('silent', 'no_lms_record', 'missed_submission', 'low_score', 'fading', 'engaged')),
  recommended_action text not null,
  reasons jsonb not null
);
create index predictions_cohort_module_prob on public.predictions (cohort_id, code_module, probability desc);

create table public.interventions (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students on delete cascade,
  code_module text not null,
  advisor_id uuid not null default auth.uid() references public.profiles on delete cascade,
  action_type text not null,
  contact_status text not null check (contact_status in ('contacted', 'unreachable', 'scheduled')),
  issue_category text check (issue_category in ('access', 'workload', 'financial', 'personal', 'academic', 'withdrawn', 'other')),
  notes text not null default '',
  follow_up_on date,
  created_at timestamptz not null default now()
);
create index interventions_student on public.interventions (student_id, created_at desc);

create table public.plans (
  id bigint generated always as identity primary key,
  cohort_id uuid not null references public.cohorts on delete cascade,
  created_by uuid references public.profiles on delete set null,
  params jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.request_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  endpoint text not null,
  status_code integer not null,
  latency_ms real not null,
  cohort_id uuid,
  created_at timestamptz not null default now()
);
create index request_log_created on public.request_log (created_at desc);

-- Row level security: on for every table; no policy means no access for signed-in users.
alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.students enable row level security;
alter table public.predictions enable row level security;
alter table public.interventions enable row level security;
alter table public.plans enable row level security;
alter table public.request_log enable row level security;

create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'admin');
create policy "admin updates profiles" on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy "signed-in users read cohorts" on public.cohorts for select to authenticated using (true);

create policy "students in my modules" on public.students for select to authenticated
  using (public.can_see_module(code_module));

create policy "predictions in my modules" on public.predictions for select to authenticated
  using (public.can_see_module(code_module));

create policy "interventions in my modules" on public.interventions for select to authenticated
  using (public.can_see_module(code_module));
create policy "log interventions in my modules" on public.interventions for insert to authenticated
  with check (advisor_id = auth.uid() and public.can_see_module(code_module));

create policy "coordinators and admins read plans" on public.plans for select to authenticated
  using (public.my_role() in ('coordinator', 'admin'));

create policy "admins read request log" on public.request_log for select to authenticated
  using (public.my_role() = 'admin');

-- Explicit grants: anon gets nothing; signed-in users get what the policies allow.
revoke all on all tables in schema public from anon;
grant select on public.profiles, public.cohorts, public.students, public.predictions,
  public.interventions, public.plans, public.request_log to authenticated;
grant update (full_name, role, modules) on public.profiles to authenticated;
grant insert (student_id, code_module, action_type, contact_status, issue_category, notes, follow_up_on)
  on public.interventions to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.my_role(), public.can_see_module(text) to authenticated;

-- Private bucket for uploaded cohort CSVs; only the API (secret key) reads and writes it.
insert into storage.buckets (id, name, public) values ('cohorts', 'cohorts', false)
on conflict (id) do nothing;
