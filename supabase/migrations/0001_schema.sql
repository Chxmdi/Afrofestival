-- =====================================================================
-- Ojoro Afro Football & Culture Festival — Montréal 2027
-- Core relational schema. PostgreSQL / Supabase.
-- UUID PKs, timestamps, FKs, indexes, validation constraints.
-- Row-level security is defined in 0002_rls.sql.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Enumerated types ----------------------------------------------------
do $$ begin
  create type app_role as enum (
    'owner_admin','event_director','sponsorship_lead','vendor_lead',
    'tournament_director','finance_lead','marketing_lead',
    'volunteer_coordinator','viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sponsor_stage as enum (
    'researching','qualified','contact_identified','ready_to_contact',
    'contacted','meeting','proposal_sent','negotiation','verbal_yes',
    'contracted','won','lost','on_hold'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo','in_progress','blocked','review','done','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vendor_status as enum ('submitted','under_review','approved','waitlisted','rejected','withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('missing','submitted','valid','expired','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type permit_status as enum ('not_started','in_progress','submitted','approved','rejected','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid','partial','paid','refunded','void');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Identity & organisation
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  email citext,
  phone text,
  avatar_url text,
  title text,
  bio text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role app_role not null,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index on public.user_roles(user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  tagline text,
  provisional_date date,
  backup_date date,
  location text,
  timezone text not null default 'America/Montreal',
  currency text not null default 'CAD',
  capacity_target int not null default 600 check (capacity_target >= 0),
  status text not null default 'planning',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_settings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  unique (event_id, key)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  website text,
  domain text,
  industry text,
  location text,
  description text,
  logo_url text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.organizations(lower(domain));
create index on public.organizations(lower(name));

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  role_title text,
  email citext,
  phone text,
  linkedin_url text,
  location text,
  source text,
  source_confidence numeric(4,2) check (source_confidence between 0 and 1),
  notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.contacts(organization_id);

create table public.contact_methods (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind text not null check (kind in ('email','phone','linkedin','instagram','website','other')),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.contact_methods(contact_id);

-- Polymorphic notes & tags -------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  author_id uuid references public.profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.notes(entity_type, entity_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  color text not null default '#c99a2c',
  created_at timestamptz not null default now()
);

create table public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, entity_type, entity_id)
);
create index on public.entity_tags(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Sponsorship
-- ---------------------------------------------------------------------
create table public.sponsor_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier_rank int not null default 0,
  cash_amount numeric(12,2) not null default 0 check (cash_amount >= 0),
  inkind_value numeric(12,2) not null default 0 check (inkind_value >= 0),
  benefits jsonb not null default '[]'::jsonb,
  slots int,
  description text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsor_prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  website text,
  domain text,
  industry text,
  location text,
  description text,
  stage sponsor_stage not null default 'researching',
  match_score int check (match_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  align_black_culture int default 0 check (align_black_culture between 0 and 100),
  align_football int default 0 check (align_football between 0 and 100),
  align_montreal int default 0 check (align_montreal between 0 and 100),
  align_youth int default 0 check (align_youth between 0 and 100),
  previous_sponsorship_evidence text,
  suggested_package_id uuid references public.sponsor_packages(id) on delete set null,
  suggested_ask numeric(12,2) check (suggested_ask >= 0),
  estimated_capacity numeric(12,2) check (estimated_capacity >= 0),
  probability numeric(4,2) not null default 0.1 check (probability between 0 and 1),
  main_contact_id uuid references public.contacts(id) on delete set null,
  contact_source text,
  contact_confidence numeric(4,2) check (contact_confidence between 0 and 1),
  last_interaction_at timestamptz,
  next_action text,
  next_action_date date,
  proposal_status text not null default 'none',
  contract_status text not null default 'none',
  commitment_type text check (commitment_type in ('cash','in_kind','mixed','none')) default 'none',
  internal_notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  submission_source text not null default 'staff',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sponsor_prospects(stage);
create index on public.sponsor_prospects(lower(domain));
create index on public.sponsor_prospects(owner_id);
-- Weighted pipeline value (generated)
alter table public.sponsor_prospects
  add column weighted_value numeric(12,2)
  generated always as (coalesce(suggested_ask,0) * coalesce(probability,0)) stored;

create table public.sponsor_contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  full_name text not null,
  role_title text,
  email citext,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.sponsor_contacts(prospect_id);

create table public.sponsor_opportunities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  package_id uuid references public.sponsor_packages(id) on delete set null,
  ask_amount numeric(12,2) check (ask_amount >= 0),
  commitment_type text default 'cash',
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsor_outreach (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  channel text not null check (channel in ('email','call','meeting','linkedin','event','other')),
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  subject text,
  body text,
  occurred_at timestamptz not null default now(),
  outcome text,
  author_id uuid references public.profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.sponsor_outreach(prospect_id);

create table public.sponsor_deliverables (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending',
  fulfilled_at timestamptz,
  proof_url text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sponsor_deliverables(prospect_id);

create table public.sponsor_commitments (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  package_id uuid references public.sponsor_packages(id) on delete set null,
  commitment_type text not null default 'cash' check (commitment_type in ('cash','in_kind','mixed')),
  cash_amount numeric(12,2) not null default 0 check (cash_amount >= 0),
  inkind_value numeric(12,2) not null default 0 check (inkind_value >= 0),
  status text not null default 'verbal' check (status in ('verbal','contracted','paid','cancelled')),
  agreed_at date,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sponsor_commitments(prospect_id);

create table public.sponsor_invoices (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.sponsor_prospects(id) on delete cascade,
  commitment_id uuid references public.sponsor_commitments(id) on delete set null,
  invoice_number text,
  amount numeric(12,2) not null check (amount >= 0),
  issued_date date,
  due_date date,
  paid_date date,
  status payment_status not null default 'unpaid',
  document_url text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sponsor_invoices(prospect_id);

-- Sponsor discovery workspace ----------------------------------------
create table public.sponsor_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  label text,
  keywords text[] not null default '{}',
  location_filters text[] not null default '{}',
  industry_filters text[] not null default '{}',
  required_signals text[] not null default '{}',
  excluded_industries text[] not null default '{}',
  excluded_companies text[] not null default '{}',
  min_ask numeric(12,2),
  max_ask numeric(12,2),
  seed_urls text[] not null default '{}',
  result_limit int not null default 20 check (result_limit between 1 and 200),
  provider text,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  error_message text,
  results_found int not null default 0,
  records_created int not null default 0,
  started_by uuid references public.profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sponsor_discovery_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sponsor_discovery_runs(id) on delete cascade,
  organization_name text not null,
  domain text,
  website text,
  description text,
  industry text,
  location text,
  community_page_url text,
  public_contact jsonb not null default '{}'::jsonb,
  sponsorship_evidence text,
  source_urls text[] not null default '{}',
  match_score int check (match_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','imported')),
  imported_prospect_id uuid references public.sponsor_prospects(id) on delete set null,
  reviewed_by uuid references public.profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.sponsor_discovery_results(run_id);
create index on public.sponsor_discovery_results(lower(domain));

create table public.sponsor_discovery_sources (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.sponsor_discovery_results(id) on delete cascade,
  url text not null,
  title text,
  excerpt text,
  signal text,
  created_at timestamptz not null default now()
);
create index on public.sponsor_discovery_sources(result_id);

create table public.sponsor_match_signals (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  weight int not null default 10 check (weight between 0 and 100),
  category text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------
create table public.vendor_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order int not null default 0
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  category_id uuid references public.vendor_categories(id) on delete set null,
  website text,
  socials jsonb not null default '{}'::jsonb,
  black_owned boolean,
  african_caribbean boolean,
  description text,
  status vendor_status not null default 'submitted',
  review_score int check (review_score between 0 and 100),
  vendor_fee numeric(12,2) default 0 check (vendor_fee >= 0),
  deposit numeric(12,2) default 0 check (deposit >= 0),
  invoice_status payment_status not null default 'unpaid',
  contract_status text not null default 'none',
  assigned_zone_id uuid,
  logistics_ready boolean not null default false,
  internal_notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vendors(status);
create index on public.vendors(category_id);

create table public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete set null,
  legal_name text not null,
  trading_name text,
  contact_name text not null,
  email citext not null,
  phone text,
  website text,
  socials jsonb not null default '{}'::jsonb,
  category text not null,
  black_owned boolean,
  african_caribbean boolean,
  menu_products text,
  price_list text,
  product_photos text[] not null default '{}',
  tent_needs text,
  table_needs int default 0,
  booth_footprint text,
  electricity_needs text,
  water_needs boolean default false,
  propane_cooking boolean default false,
  food_permit boolean default false,
  mapaq_number text,
  insurance boolean default false,
  status vendor_status not null default 'submitted',
  review_score int check (review_score between 0 and 100),
  reviewer_notes text,
  submission_source text not null default 'public_form',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vendor_applications(status);

create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  full_name text not null,
  role_title text,
  email citext,
  phone text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.vendor_contacts(vendor_id);

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  doc_type text not null,
  file_url text,
  status doc_status not null default 'missing',
  issued_date date,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vendor_documents(vendor_id);

create table public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  kind text not null default 'fee' check (kind in ('fee','deposit','refund')),
  status payment_status not null default 'unpaid',
  due_date date,
  paid_date date,
  method text,
  reference text,
  created_at timestamptz not null default now()
);
create index on public.vendor_payments(vendor_id);

create table public.vendor_requirements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  label text not null,
  required boolean not null default true,
  met boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.vendor_requirements(vendor_id);

-- ---------------------------------------------------------------------
-- Cultural programme & performers
-- ---------------------------------------------------------------------
create table public.performers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discipline text not null check (discipline in ('dj','musician','dance_group','spoken_word','visual_artist','barber','host','freestyler','fashion','other')),
  bio text,
  website text,
  socials jsonb not null default '{}'::jsonb,
  contact_name text,
  email citext,
  phone text,
  black_owned boolean,
  fee numeric(12,2) default 0 check (fee >= 0),
  status text not null default 'prospect' check (status in ('prospect','invited','confirmed','declined','cancelled')),
  submission_source text not null default 'staff',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.performer_bookings (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid not null references public.performers(id) on delete cascade,
  contract_status text not null default 'none',
  technical_needs text,
  arrival_time timestamptz,
  stage_time timestamptz,
  set_length_min int,
  fee numeric(12,2) default 0 check (fee >= 0),
  payment_status payment_status not null default 'unpaid',
  stage text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.performer_bookings(performer_id);

-- ---------------------------------------------------------------------
-- Venues & site operations
-- ---------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  capacity int check (capacity >= 0),
  suitable_pitches int default 0 check (suitable_pitches >= 0),
  indoor_outdoor text check (indoor_outdoor in ('indoor','outdoor','both')),
  availability text,
  cost numeric(12,2) check (cost >= 0),
  deposit numeric(12,2) check (deposit >= 0),
  transit_access text,
  parking text,
  accessibility text,
  stage_rules text,
  sound_restrictions text,
  food_sales text,
  alcohol_rules text,
  ticketing_rules text,
  curfew text,
  power text,
  washrooms text,
  rain_plan text,
  overall_score int check (overall_score between 0 and 100),
  status text not null default 'considering' check (status in ('considering','shortlisted','quoted','selected','rejected')),
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venue_quotes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  valid_until date,
  document_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.venue_quotes(venue_id);

create table public.venue_requirements (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  label text not null,
  met boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.venue_requirements(venue_id);

create table public.site_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone_type text not null,
  description text,
  capacity int,
  manager_id uuid references public.profiles(id) on delete set null,
  notes text,
  sort_order int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK from vendors.assigned_zone_id (added after site_zones exists)
alter table public.vendors
  add constraint vendors_zone_fk foreign key (assigned_zone_id)
  references public.site_zones(id) on delete set null;

-- ---------------------------------------------------------------------
-- Tournament
-- ---------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crest_url text,
  color_primary text,
  color_secondary text,
  represents text,
  neighbourhood text,
  captain_name text,
  captain_email citext,
  captain_phone text,
  manager_name text,
  manager_email citext,
  manager_phone text,
  registration_status text not null default 'pending' check (registration_status in ('pending','approved','waitlisted','withdrawn')),
  payment_status payment_status not null default 'unpaid',
  registration_fee numeric(10,2) not null default 0 check (registration_fee >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  eligibility_ok boolean not null default false,
  submission_source text not null default 'staff',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.teams(registration_status);

create table public.team_staff (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff',
  email citext,
  phone text,
  created_at timestamptz not null default now()
);
create index on public.team_staff(team_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  jersey_number int check (jersey_number between 0 and 99),
  position text,
  date_of_birth date,
  email citext,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  -- Player cost is capped at CAD $45 in both UI and DB
  player_fee numeric(10,2) not null default 0 check (player_fee >= 0 and player_fee <= 45),
  payment_status payment_status not null default 'unpaid',
  eligibility_ok boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.players(team_id);

create table public.player_waivers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  signed boolean not null default false,
  signed_at timestamptz,
  signer_name text,
  document_url text,
  is_minor boolean not null default false,
  guardian_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.player_waivers(player_id);

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  created_at timestamptz not null default now(),
  unique (group_id, team_id)
);
create index on public.group_members(group_id);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'group' check (stage in ('group','quarterfinal','semifinal','third_place','final')),
  group_id uuid references public.tournament_groups(id) on delete set null,
  round int,
  pitch int check (pitch between 1 and 8),
  kickoff timestamptz,
  slot_index int,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_label text,
  away_label text,
  home_score int check (home_score >= 0),
  away_score int check (away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','postponed','cancelled')),
  checklist jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fixtures(stage);
create index on public.fixtures(group_id);

create table public.match_officials (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  name text not null,
  role text not null default 'referee' check (role in ('referee','assistant','fourth_official')),
  phone text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.match_officials(fixture_id);

create table public.standings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  goals_for int not null default 0,
  goals_against int not null default 0,
  goal_diff int not null default 0,
  points int not null default 0,
  rank int,
  updated_at timestamptz not null default now(),
  unique (group_id, team_id)
);
create index on public.standings(group_id);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  recipient_name text,
  notes text,
  awarded boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Programme (run of show)
-- ---------------------------------------------------------------------
create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  zone_id uuid references public.site_zones(id) on delete set null,
  performer_id uuid references public.performers(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  item_type text not null default 'performance',
  owner_id uuid references public.profiles(id) on delete set null,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.program_items(start_time);

-- ---------------------------------------------------------------------
-- Planning
-- ---------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  phase text,
  target_date date,
  status text not null default 'upcoming' check (status in ('upcoming','on_track','at_risk','done','missed')),
  description text,
  sort_order int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department text,
  phase text,
  owner_id uuid references public.profiles(id) on delete set null,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  start_date date,
  due_date date,
  estimated_cost numeric(12,2) default 0 check (estimated_cost >= 0),
  related_type text,
  related_id uuid,
  milestone_id uuid references public.milestones(id) on delete set null,
  is_blocker boolean not null default false,
  blocked_reason text,
  recurring boolean not null default false,
  on_critical_path boolean not null default false,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks(status);
create index on public.tasks(due_date);
create index on public.tasks(owner_id);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.subtasks(task_id);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  author_id uuid references public.profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.comments(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'expense' check (kind in ('expense','revenue')),
  scenario text not null default 'recommended' check (scenario in ('lean','recommended','premium')),
  sort_order int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  name text not null,
  planned_amount numeric(12,2) not null default 0,
  quoted_amount numeric(12,2) not null default 0,
  committed_amount numeric(12,2) not null default 0,
  invoiced_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  forecast_amount numeric(12,2) not null default 0,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.budget_items(category_id);
alter table public.budget_items
  add column variance numeric(12,2)
  generated always as (coalesce(forecast_amount,0) - coalesce(planned_amount,0)) stored;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  budget_item_id uuid references public.budget_items(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  category text,
  is_in_kind boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approved_by uuid references public.profiles(id) on delete set null,
  receipt_url text,
  payment_status payment_status not null default 'unpaid',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.expenses(budget_item_id);

create table public.revenues (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('sponsors','team_registrations','tickets','vendors','merchandise','grants','donations')),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  received_date date,
  expected_date date,
  status text not null default 'expected' check (status in ('expected','committed','received')),
  is_in_kind boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.revenues(source_type);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  party_type text not null check (party_type in ('vendor','sponsor','supplier','other')),
  party_name text not null,
  invoice_number text,
  direction text not null default 'incoming' check (direction in ('incoming','outgoing')),
  amount numeric(12,2) not null check (amount >= 0),
  issued_date date,
  due_date date,
  paid_date date,
  status payment_status not null default 'unpaid',
  document_url text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  direction text not null default 'outgoing' check (direction in ('incoming','outgoing')),
  amount numeric(12,2) not null check (amount >= 0),
  method text,
  reference text,
  paid_date date not null default current_date,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- People (staff & volunteers)
-- ---------------------------------------------------------------------
create table public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  headcount_needed int not null default 1 check (headcount_needed >= 0),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email citext,
  phone text,
  skills text[] not null default '{}',
  availability text,
  emergency_contact_name text,
  emergency_contact_phone text,
  training_status text not null default 'not_started' check (training_status in ('not_started','in_progress','complete')),
  consent_given boolean not null default false,
  role_id uuid references public.volunteer_roles(id) on delete set null,
  status text not null default 'applied' check (status in ('applied','approved','confirmed','declined','inactive')),
  checked_in boolean not null default false,
  submission_source text not null default 'staff',
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.volunteers(status);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  role_id uuid references public.volunteer_roles(id) on delete set null,
  zone_id uuid references public.site_zones(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slots_needed int not null default 1 check (slots_needed >= 0),
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.shifts(starts_at);

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned','confirmed','checked_in','no_show')),
  created_at timestamptz not null default now(),
  unique (shift_id, volunteer_id)
);
create index on public.shift_assignments(shift_id);
create index on public.shift_assignments(volunteer_id);

-- ---------------------------------------------------------------------
-- Compliance, risk & governance
-- ---------------------------------------------------------------------
create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  requirement text not null,
  authority text,
  owner_id uuid references public.profiles(id) on delete set null,
  submission_deadline date,
  submission_date date,
  status permit_status not null default 'not_started',
  fee numeric(12,2) default 0 check (fee >= 0),
  dependencies text,
  expiry_date date,
  document_url text,
  notes text,
  needs_verification boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permits (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid references public.compliance_requirements(id) on delete set null,
  name text not null,
  authority text,
  status permit_status not null default 'not_started',
  submitted_date date,
  approved_date date,
  expiry_date date,
  fee numeric(12,2) default 0,
  document_url text,
  notes text,
  needs_verification boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  likelihood int check (likelihood between 1 and 5),
  impact int check (impact between 1 and 5),
  mitigation text,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','mitigating','closed')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.risks
  add column severity int generated always as (coalesce(likelihood,0) * coalesce(impact,0)) stored;

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text,
  decision text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at date,
  status text not null default 'proposed' check (status in ('proposed','decided','revisited')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority task_priority not null default 'medium',
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  owner_id uuid references public.profiles(id) on delete set null,
  related_type text,
  related_id uuid,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Procurement
-- ---------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  contact_name text,
  email citext,
  phone text,
  website text,
  notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  quantity_needed int not null default 1 check (quantity_needed >= 0),
  quantity_secured int not null default 0 check (quantity_secured >= 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  unit_cost numeric(12,2) default 0 check (unit_cost >= 0),
  status text not null default 'needed' check (status in ('needed','sourced','ordered','received')),
  zone_id uuid references public.site_zones(id) on delete set null,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  po_number text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'draft' check (status in ('draft','sent','confirmed','received','cancelled')),
  ordered_date date,
  expected_date date,
  document_url text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket text not null default 'documents',
  file_path text,
  file_url text,
  doc_type text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (document_id, entity_type, entity_id)
);
create index on public.document_links(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'brand_launch',
  status text not null default 'planned' check (status in ('planned','active','paused','complete')),
  start_date date,
  end_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  goal text,
  budget numeric(12,2) default 0 check (budget >= 0),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  channel text,
  content_type text,
  status text not null default 'idea' check (status in ('idea','drafting','review','approved','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  body text,
  sponsor_obligation_id uuid references public.sponsor_deliverables(id) on delete set null,
  metrics jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.content_items(campaign_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket text not null default 'media-assets',
  file_path text,
  file_url text,
  asset_type text,
  mime_type text,
  tags text[] not null default '{}',
  uploaded_by uuid references public.profiles(id) on delete set null,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- System: notifications & activity log
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  level text not null default 'info' check (level in ('info','success','warning','critical')),
  link text,
  read boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, read);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.activity_logs(entity_type, entity_id);
create index on public.activity_logs(created_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers (applied to every table having the column)
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format(
      'drop trigger if exists trg_updated_at on public.%1$I;
       create trigger trg_updated_at before update on public.%1$I
       for each row execute function public.set_updated_at();', t.table_name);
  end loop;
end $$;
