-- =====================================================================
-- Security hardening (addresses Supabase advisor warnings)
--  1. Pin search_path on the updated_at trigger function
--  2. Tighten public intake INSERT policies (no more WITH CHECK (true));
--     keep anon insert only on tables the public forms actually use
--  3. Keep RLS helper functions callable by authenticated (RLS needs it)
--     but revoke EXECUTE from anon / PUBLIC so they aren't public RPCs
-- =====================================================================

-- 1. Trigger function search_path -------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 2. Public intake policies -------------------------------------------
-- Drop anon insert on tables no public form targets.
do $$
declare t text;
  drop_list text[] := array['players','team_staff','sponsor_contacts','contacts'];
begin
  foreach t in array drop_list loop
    execute format('drop policy if exists public_intake_insert on public.%I', t);
    execute format('revoke insert on public.%I from anon', t);
  end loop;
end $$;

-- Replace the remaining intake policies with constrained checks so anon
-- can only create genuine public submissions (never sample/staff rows).
drop policy if exists public_intake_insert on public.teams;
create policy public_intake_insert on public.teams for insert to anon
  with check (submission_source = 'public_form' and registration_status = 'pending' and coalesce(is_sample,false) = false);

drop policy if exists public_intake_insert on public.vendor_applications;
create policy public_intake_insert on public.vendor_applications for insert to anon
  with check (submission_source = 'public_form' and coalesce(is_sample,false) = false);

drop policy if exists public_intake_insert on public.volunteers;
create policy public_intake_insert on public.volunteers for insert to anon
  with check (submission_source = 'public_form' and status = 'applied' and coalesce(is_sample,false) = false);

drop policy if exists public_intake_insert on public.performers;
create policy public_intake_insert on public.performers for insert to anon
  with check (submission_source = 'public_form' and status = 'prospect' and coalesce(is_sample,false) = false);

drop policy if exists public_intake_insert on public.sponsor_prospects;
create policy public_intake_insert on public.sponsor_prospects for insert to anon
  with check (submission_source = 'inquiry' and coalesce(is_sample,false) = false);

-- 3. Lock down RLS helper functions -----------------------------------
-- authenticated must keep EXECUTE (policies call these); anon must not.
revoke execute on function public.is_staff() from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.can_edit() from anon, public;
revoke execute on function public.can_delete() from anon, public;
revoke execute on function public.can_edit_finance() from anon, public;
revoke execute on function public.has_role(app_role[]) from anon, public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_edit() to authenticated;
grant execute on function public.can_delete() to authenticated;
grant execute on function public.can_edit_finance() to authenticated;
grant execute on function public.has_role(app_role[]) to authenticated;

-- Trigger-only function: never needs to be a callable RPC.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
