-- =====================================================================
-- Row-Level Security & access helpers
-- Internal records are never readable by anon. Public forms may insert
-- into a defined set of intake tables only.
-- =====================================================================

-- Role helpers (SECURITY DEFINER to safely read user_roles under RLS) --
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r where r.user_id = auth.uid());
$$;

create or replace function public.has_role(roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = any(roles)
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['owner_admin']::app_role[]);
$$;

-- Any role other than a pure viewer may edit.
create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role <> 'viewer'
  );
$$;

create or replace function public.can_delete()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['owner_admin','event_director']::app_role[]);
$$;

create or replace function public.can_edit_finance()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['owner_admin','event_director','finance_lead']::app_role[]);
$$;

-- Auto-provision a profile + bootstrap the first user as owner_admin ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role) values (new.id, 'owner_admin');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Apply RLS + generic policies across the schema
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  special  text[] := array['user_roles','profiles','notifications','activity_logs'];
  finance  text[] := array['budget_categories','budget_items','expenses','revenues','invoices','payments','sponsor_invoices','sponsor_commitments'];
  intake   text[] := array['vendor_applications','volunteers','teams','players','team_staff','performers','sponsor_prospects','sponsor_contacts','contacts'];
begin
  for t in select tablename from pg_tables where schemaname='public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    -- special tables handled explicitly below
    if t = any(special) then continue; end if;

    -- Everyone on staff may read internal records
    execute format($p$create policy staff_select on public.%I
      for select to authenticated using (public.is_staff())$p$, t);

    if t = any(finance) then
      execute format($p$create policy fin_insert on public.%I
        for insert to authenticated with check (public.can_edit_finance())$p$, t);
      execute format($p$create policy fin_update on public.%I
        for update to authenticated using (public.can_edit_finance())
        with check (public.can_edit_finance())$p$, t);
    else
      execute format($p$create policy staff_insert on public.%I
        for insert to authenticated with check (public.can_edit())$p$, t);
      execute format($p$create policy staff_update on public.%I
        for update to authenticated using (public.can_edit())
        with check (public.can_edit())$p$, t);
    end if;

    execute format($p$create policy admin_delete on public.%I
      for delete to authenticated using (public.can_delete())$p$, t);

    -- Public intake: anonymous submissions may insert but never read
    if t = any(intake) then
      execute format('grant insert on public.%I to anon', t);
      execute format($p$create policy public_intake_insert on public.%I
        for insert to anon with check (true)$p$, t);
    end if;
  end loop;
end $$;

-- profiles: staff can read all; users manage their own; admin manages all
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_staff() or id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- user_roles: staff read; only admins mutate
create policy roles_select on public.user_roles
  for select to authenticated using (public.is_staff());
create policy roles_admin_write on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications: users see & manage their own; staff may create
create policy notif_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notif_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_insert on public.notifications
  for insert to authenticated with check (public.is_staff());
create policy notif_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- activity_logs: staff read; any authenticated staff may append
create policy activity_select on public.activity_logs
  for select to authenticated using (public.is_staff());
create policy activity_insert on public.activity_logs
  for insert to authenticated with check (auth.uid() is not null);
