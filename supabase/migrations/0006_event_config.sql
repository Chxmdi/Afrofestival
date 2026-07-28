-- =====================================================================
-- Make event configuration data-driven and editable from the app.
--  * The CAD $45 player-fee cap becomes a CONFIGURABLE limit read from
--    event_settings (finance.max_player_fee, default 45) via a trigger,
--    instead of a hard-coded CHECK constraint.
--  * Public application forms may read the event and its tournament
--    format so the public UI reflects live configuration.
-- =====================================================================

-- 1. Configurable player-fee cap --------------------------------------
create or replace function public.current_max_player_fee()
returns numeric language sql stable set search_path = public as $$
  select coalesce(
    (select (value->>'max_player_fee')::numeric from public.event_settings where key = 'finance' limit 1),
    (select (value->>'max_player_fee')::numeric from public.event_settings where key = 'tournament' limit 1),
    45
  );
$$;

create or replace function public.enforce_player_fee_cap()
returns trigger language plpgsql set search_path = public as $$
declare cap numeric := public.current_max_player_fee();
begin
  if new.player_fee < 0 then
    raise exception 'player_fee cannot be negative' using errcode = '23514';
  end if;
  if new.player_fee > cap then
    raise exception 'player_fee % exceeds the configured maximum of %', new.player_fee, cap
      using errcode = '23514';
  end if;
  return new;
end $$;

-- Swap the fixed <= 45 check for a non-negative check + configurable trigger
alter table public.players drop constraint if exists players_player_fee_check;
alter table public.players
  add constraint players_player_fee_nonneg check (player_fee >= 0);

drop trigger if exists trg_player_fee_cap on public.players;
create trigger trg_player_fee_cap
  before insert or update on public.players
  for each row execute function public.enforce_player_fee_cap();

-- 2. Public read of event + tournament format -------------------------
-- Event details and the tournament format are public information; the
-- finance settings key stays private (staff-only).
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon using (archived_at is null);

drop policy if exists settings_public_read on public.event_settings;
create policy settings_public_read on public.event_settings
  for select to anon using (key = 'tournament');
