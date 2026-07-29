import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { isSupabaseConfigured } from './env';
import { daysUntil } from './format';
import type { EventConfig } from './eventConfig';

async function rows<T = Record<string, unknown>>(table: string, select = '*'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return (data ?? []) as T[];
}

export interface DashboardData {
  daysUntil: number;
  readiness: number;
  budget: {
    planned: number; committed: number; paid: number; forecast: number;
    variance: number; remaining: number;
  };
  sponsors: {
    cashGoal: number; inkindGoal: number; securedCash: number; securedInkind: number;
    weightedPipeline: number; outstandingInvoices: number; byStage: Record<string, number>;
    funnelValue: number;
  };
  vendors: { applications: number; approved: number; missingDocs: number; byCategory: Record<string, number> };
  tournament: { teams: number; teamsMax: number; players: number; outstandingWaivers: number; fixtures: number; regProgress: number };
  tasks: { dueThisWeek: number; overdue: number; blocked: number; byStatus: Record<string, number>; total: number };
  milestones: { atRisk: number };
  permits: { byStatus: Record<string, number>; total: number };
  volunteers: { recruited: number; assigned: number; uncoveredShifts: number };
  attendance: { target: number; forecast: number };
}

export function useDashboard(cfg: EventConfig) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', cfg.eventId, cfg.sponsorCashGoal, cfg.teams, cfg.workingBudget, cfg.capacityTarget],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const [
        cats, items, sponsors, commitments, spInvoices, vendorApps, vendors, vendorDocs,
        teams, players, waivers, fixtures, tasks, milestones, permits, volunteers, shifts, assigns, revenues,
      ] = await Promise.all([
        rows<{ id: string; kind: string; scenario: string }>('budget_categories', 'id,kind,scenario'),
        rows<{ category_id: string; planned_amount: number; committed_amount: number; paid_amount: number; forecast_amount: number; variance: number }>('budget_items'),
        rows<{ stage: string; weighted_value: number; suggested_ask: number; probability: number }>('sponsor_prospects', 'stage,weighted_value,suggested_ask,probability'),
        rows<{ commitment_type: string; cash_amount: number; inkind_value: number; status: string }>('sponsor_commitments'),
        rows<{ amount: number; status: string }>('sponsor_invoices', 'amount,status'),
        rows('vendor_applications', 'id'),
        rows<{ id: string; status: string; category_id: string | null }>('vendors', 'id,status,category_id'),
        rows<{ vendor_id: string; status: string }>('vendor_documents', 'vendor_id,status'),
        rows<{ registration_status: string }>('teams', 'registration_status'),
        rows('players', 'id'),
        rows<{ signed: boolean }>('player_waivers', 'signed'),
        rows('fixtures', 'id'),
        rows<{ status: string; due_date: string | null; is_blocker: boolean }>('tasks', 'status,due_date,is_blocker'),
        rows<{ status: string }>('milestones', 'status'),
        rows<{ status: string }>('compliance_requirements', 'status'),
        rows<{ status: string }>('volunteers', 'status'),
        rows<{ id: string; slots_needed: number }>('shifts', 'id,slots_needed'),
        rows<{ shift_id: string; volunteer_id: string }>('shift_assignments', 'shift_id,volunteer_id'),
        rows<{ source_type: string; amount: number; status: string; is_in_kind: boolean }>('revenues'),
      ]);

      // Budget (recommended expense scenario)
      const expenseCatIds = new Set(cats.filter((c) => c.kind === 'expense').map((c) => c.id));
      const exp = items.filter((i) => expenseCatIds.has(i.category_id));
      const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0);
      const planned = sum(exp.map((i) => i.planned_amount));
      const committed = sum(exp.map((i) => i.committed_amount));
      const paid = sum(exp.map((i) => i.paid_amount));
      const forecast = sum(exp.map((i) => i.forecast_amount));
      const variance = sum(exp.map((i) => Number(i.variance ?? 0)));

      // Sponsors
      const securedCash = sum(commitments.filter((c) => ['contracted', 'paid'].includes(c.status)).map((c) => c.cash_amount))
        + sum(revenues.filter((r) => r.source_type === 'sponsors' && r.status === 'received' && !r.is_in_kind).map((r) => r.amount));
      const securedInkind = sum(commitments.map((c) => (c.status !== 'cancelled' ? c.inkind_value : 0)));
      const openStages = new Set(['contacted', 'meeting', 'proposal_sent', 'negotiation', 'verbal_yes', 'ready_to_contact', 'contact_identified', 'qualified']);
      const weightedPipeline = sum(sponsors.filter((s) => openStages.has(s.stage)).map((s) => Number(s.weighted_value ?? 0)));
      const outstandingInvoices = sum(spInvoices.filter((i) => i.status !== 'paid').map((i) => i.amount));
      const byStage: Record<string, number> = {};
      sponsors.forEach((s) => { byStage[s.stage] = (byStage[s.stage] ?? 0) + 1; });

      // Vendors
      const approved = vendors.filter((v) => v.status === 'approved').length;
      const missingDocVendors = new Set(vendorDocs.filter((d) => ['missing', 'expired'].includes(d.status)).map((d) => d.vendor_id));
      const byCategory: Record<string, number> = {};
      vendors.forEach((v) => { const k = v.category_id ?? 'unassigned'; byCategory[k] = (byCategory[k] ?? 0) + 1; });

      // Tournament
      const teamsApproved = teams.filter((t) => t.registration_status === 'approved').length;
      const outstandingWaivers = waivers.filter((w) => !w.signed).length;

      // Tasks
      const now = Date.now();
      const week = now + 7 * 86_400_000;
      const active = tasks.filter((t) => !['done', 'cancelled'].includes(t.status));
      const dueThisWeek = active.filter((t) => t.due_date && new Date(t.due_date).getTime() <= week && new Date(t.due_date).getTime() >= now).length;
      const overdue = active.filter((t) => t.due_date && new Date(t.due_date).getTime() < now).length;
      const blocked = tasks.filter((t) => t.status === 'blocked' || t.is_blocker).length;
      const byStatus: Record<string, number> = {};
      tasks.forEach((t) => { byStatus[t.status] = (byStatus[t.status] ?? 0) + 1; });

      // Permits
      const permitStatus: Record<string, number> = {};
      permits.forEach((p) => { permitStatus[p.status] = (permitStatus[p.status] ?? 0) + 1; });

      // Volunteers
      const recruited = volunteers.filter((v) => ['approved', 'confirmed'].includes(v.status)).length;
      const assignedIds = new Set(assigns.map((a) => a.volunteer_id));
      const filledByShift: Record<string, number> = {};
      assigns.forEach((a) => { filledByShift[a.shift_id] = (filledByShift[a.shift_id] ?? 0) + 1; });
      const uncoveredShifts = shifts.filter((s) => (filledByShift[s.id] ?? 0) < s.slots_needed).length;

      // Readiness — weighted composite of key signals (0-100)
      const clamp = (n: number) => Math.max(0, Math.min(1, n));
      const readiness = Math.round(100 * (
        0.25 * clamp(securedCash / (cfg.sponsorCashGoal || 1)) +
        0.20 * clamp(teamsApproved / cfg.teams) +
        0.15 * clamp((approved) / Math.max(1, vendors.length)) +
        0.15 * clamp((tasks.length - overdue - blocked) / Math.max(1, tasks.length)) +
        0.10 * clamp(1 - outstandingWaivers / Math.max(1, players.length)) +
        0.10 * clamp(recruited / 40) +
        0.05 * clamp((permits.length - (permitStatus['not_started'] ?? 0)) / Math.max(1, permits.length))
      ));

      return {
        daysUntil: daysUntil(cfg.provisionalDate),
        readiness,
        budget: { planned, committed, paid, forecast, variance, remaining: (cfg.workingBudget || planned) - paid },
        sponsors: {
          cashGoal: cfg.sponsorCashGoal, inkindGoal: cfg.sponsorInkindGoal,
          securedCash, securedInkind, weightedPipeline, outstandingInvoices, byStage,
          funnelValue: sum(sponsors.map((s) => Number(s.suggested_ask ?? 0))),
        },
        vendors: { applications: vendorApps.length, approved, missingDocs: missingDocVendors.size, byCategory },
        tournament: {
          teams: teamsApproved, teamsMax: cfg.teams, players: players.length,
          outstandingWaivers, fixtures: fixtures.length,
          regProgress: Math.round((teamsApproved / cfg.teams) * 100),
        },
        tasks: { dueThisWeek, overdue, blocked, byStatus, total: tasks.length },
        milestones: { atRisk: milestones.filter((m) => ['at_risk', 'missed'].includes(m.status)).length },
        permits: { byStatus: permitStatus, total: permits.length },
        volunteers: { recruited, assigned: assignedIds.size, uncoveredShifts },
        attendance: { target: cfg.capacityTarget, forecast: Math.round(cfg.capacityTarget * 0.72) },
      };
    },
  });
}
