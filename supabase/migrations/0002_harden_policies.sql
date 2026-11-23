-- Hardening after the security review of 2026-11-23.

-- The demo admin role is open to any visitor, and no screen edits profiles: roles and modules are set only through
-- app_metadata and the seed script (secret key). Remove the client-side update path so no session can change roles.
drop policy if exists "admin updates profiles" on public.profiles;
revoke update on public.profiles from authenticated;

-- An intervention must name the module of the student it is about; before, any visible module was accepted, so a
-- user could log a contact on a student outside their modules.
drop policy if exists "log interventions in my modules" on public.interventions;
create policy "log interventions in my modules" on public.interventions for insert to authenticated
  with check (
    advisor_id = auth.uid()
    and public.can_see_module(code_module)
    and exists (select 1 from public.students s where s.id = student_id and s.code_module = interventions.code_module)
  );

-- Postgres grants EXECUTE on new functions to PUBLIC; only signed-in users need the policy helpers.
revoke execute on function public.my_role(), public.can_see_module(text), public.handle_new_user() from public, anon;
grant execute on function public.my_role(), public.can_see_module(text) to authenticated;

-- Tables created later must not be readable by the anon key by default.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;
