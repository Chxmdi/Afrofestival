# Ojoro Afro Football & Culture Festival — Montréal 2027

The operations platform and **single source of truth** for the Ojoro Afro Football & Culture Festival: a 16-team, seven-a-side football tournament woven together with Black culture — Afrobeats & Amapiano, dance, visual art, poetry, food, fashion, hair and barbering.

Every contact, decision, document, payment, deadline and operational requirement lives here.

> **Event snapshot** — Provisional **17 July 2027** (backup 24 July 2027) · Montréal, Québec · `America/Montreal` · CAD · capacity 600 · 16 teams · four groups of four · max player fee **CAD $45** · max ticket **CAD $45** · sponsorship cash goal **CAD $32,000** · in-kind goal **CAD $10,000** · working budget **CAD $55,500**.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript (strict), Vite |
| Styling | Tailwind CSS — bespoke **Afro-modern** design system |
| Server state | TanStack React Query |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Charts | Recharts |
| Icons | lucide-react |

Design language: deep charcoal & ink, warm cream, rich green, burnt orange, burgundy and restrained gold, with editorial typography (Clash Display + Inter), clean data tables/cards and subtle geometric textures. No generic sports-dashboard template, no stereotypical patterns.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   → set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Apply the database (schema, RLS, storage, sample data)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # runs supabase/migrations/*.sql in order

# 4. Deploy the discovery Edge Function (optional but recommended)
supabase functions deploy sponsor-discovery
supabase secrets set TAVILY_API_KEY=...     # or SERPER_API_KEY=...

# 5. Run
npm run dev               # http://localhost:5173
```

The **first account to sign up automatically becomes Owner / Admin** (bootstrapped by a database trigger). That admin then invites teammates and assigns roles from **Settings**.

### Scripts
- `npm run dev` – Vite dev server
- `npm run build` – strict typecheck + production build
- `npm run preview` – preview the production build
- `npm run lint` – `tsc --noEmit`

---

## Required environment secrets

| Name | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (client) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` (client) | Public anon key — safe to expose, protected by RLS |
| `TAVILY_API_KEY` | Edge Function secret | Sponsor discovery search provider (option A) |
| `SERPER_API_KEY` | Edge Function secret | Sponsor discovery search provider (option B) |

Only **one** of `TAVILY_API_KEY` / `SERPER_API_KEY` is needed for live discovery. **When neither is set**, the discovery run returns an explicit "missing secret" message (never fake results) and **manual URL entry + CSV import still work**. Search secrets live **server-side only** and are never shipped to the browser.

---

## Roles & permissions

Authentication is handled by Supabase. Nine roles are enforced by **PostgreSQL row-level security** — not just the UI.

| Role | Summary |
|---|---|
| **Owner / Admin** | Full access; invites users and assigns roles |
| **Event Director** | Broad access across all modules; can delete/finance |
| **Sponsorship Lead** | Sponsor CRM & discovery |
| **Vendor Lead** | Vendor applications & directory |
| **Tournament Director** | Teams, fixtures, standings, awards |
| **Finance Lead** | Budget, revenue, expenses, invoices |
| **Marketing Lead** | Campaigns, content, media, programme |
| **Volunteer Coordinator** | Volunteers, roles, shifts |
| **Viewer** | Read-only across permitted modules |

RLS guarantees:
- **Internal records are never publicly readable.** Anonymous users cannot `SELECT` anything internal.
- **Public application forms may securely `INSERT`** into a defined intake set only (team, vendor, volunteer, sponsor, performer) — with no read access.
- **Finance tables** (`budget_*`, `expenses`, `revenues`, `invoices`, `payments`, `sponsor_invoices`, `sponsor_commitments`) are writable only by Finance Lead / Event Director / Admin.
- **Viewers are read-only**; only Admin/Director can delete.
- The **CAD $45 player fee cap** is enforced by a `CHECK` constraint (`players.player_fee <= 45`) as well as in the UI.

---

## Database

Relational schema in `supabase/migrations/`:

- `0001_schema.sql` — 90+ tables, UUID primary keys, timestamps, foreign keys, indexes, validation `CHECK` constraints, generated columns (weighted pipeline value, budget variance, risk severity), soft-delete via `archived_at`, and `updated_at` triggers.
- `0002_rls.sql` — role helper functions (`is_staff`, `has_role`, `can_edit`, `can_delete`, `can_edit_finance`), the new-user/profile bootstrap trigger, and RLS policies across every table.
- `0003_storage.sql` — seven **private** storage buckets with RLS: `documents`, `receipts`, `vendor-files`, `sponsor-proposals`, `team-crests`, `player-waivers`, `media-assets`.
- `0004_seed.sql` — **SAMPLE** data (every row flagged `is_sample = true` and visibly labelled `SAMPLE` in the UI), including a recommended budget totalling **≈ CAD $55,500**, 16 teams across 4 groups with a full 32-fixture schedule, sponsor pipeline, vendors, volunteers, performers, campaigns and seeded **compliance placeholders explicitly flagged `needs_verification`**.

---

## Modules

- **Executive Dashboard** — live readiness score, budget flow, sponsorship, tournament, vendor, task, volunteer, permit and attendance metrics; ranked **Needs Attention** panel; budget / funnel / task / vendor charts; recent activity; quick actions. Every tile opens its module.
- **Sponsor CRM** — Kanban pipeline (drag to change stage), table and analytics; detail view with **explainable match score** breakdown, alignment meters, outreach log, deliverables and invoices.
- **Sponsor Discovery** — configurable research runs via the `sponsor-discovery` Edge Function, plus manual URL import and CSV import with domain/name dedup, evidence excerpts + source URLs, explainable scoring, run history, error reporting, and **human approval before anything reaches the CRM**.
- **Vendors** — application review queue + approved directory, missing-document alerts, category analytics.
- **Tournament** — team registration, live standings (configurable tie-breakers), group + knockout fixtures with inline results, and awards.
- **Finance** — Lean / Recommended / Premium scenarios, budget lines, revenue & expense ledgers, in-kind support, approvals and a **break-even calculator** (ticket price capped at CAD $45).
- **Planning** — task board / table / milestones with priorities, blockers, critical-path indicators and days-late.
- **Venues & Site** — venue comparison workspace and site-zone layout.
- **Compliance & Risk** — permit/compliance tracker (flagged *needs verification*), risk register, decisions and issues.
- **People** — volunteer directory, roles and shift scheduling.
- **Cultural Programme** — performers/creators and run of show.
- **Marketing** — campaigns, content calendar and media library.
- **Contacts** — master contact + organisation directory.
- **Documents** — central register linked to secure buckets.
- **Reports** — 10 printable / CSV-exportable operational reports.
- **Public forms** (`/apply`) — polished team, vendor, volunteer, sponsor and performer forms with validation, success screens and a honeypot spam guard. They insert into internal review queues without exposing any internal data.

App shell: collapsible desktop sidebar, mobile navigation, global search + command palette (`⌘/Ctrl-K`), notification centre, quick-add menu and a user/role menu.

---

## Editable event configuration

Nothing about the event is hard-coded. **Settings → Event configuration** (Owner/Admin or Event Director) edits, live:

- **Event** — name, tagline, location, timezone, currency, provisional & backup dates, capacity target
- **Tournament format** — number of teams, groups, players per team (min/max), pitches, slot length
- **Finance** — working budget, sponsorship cash & in-kind goals, **max player fee**, **max ticket price**

Values are stored in the `events` and `event_settings` tables and read through an `EventConfigProvider`, so the dashboard, tournament, finance and public forms update immediately. The **max player fee is enforced by a database trigger** (`enforce_player_fee_cap`) that reads the configured limit — change it in Settings and the database honours the new ceiling (lowering it rejects any player priced above it). The event details and tournament format are readable by the public application forms; finance settings stay staff-only.

## Sample vs. real data

All seeded records carry `is_sample = true` and render a **SAMPLE** badge so demonstration data is never confused with live operational records. Seeded compliance items are planning placeholders and are labelled **needs verification** until confirmed with the relevant authorities.

## Project structure

```
supabase/
  migrations/        0001_schema · 0002_rls · 0003_storage · 0004_seed
  functions/sponsor-discovery/index.ts
src/
  auth/              AuthProvider (session + roles)
  components/        ui, DataTable, Form, Modal, ResourceManager, layout/*
  lib/               supabase, hooks, dashboard, constants, format, nav
  pages/             Dashboard, Sponsors, Discovery, Vendors, Tournament,
                     Finance, Planning, Venues, Compliance, People,
                     Programme, Marketing, Contacts, Documents, Reports,
                     Settings, public/*
```
