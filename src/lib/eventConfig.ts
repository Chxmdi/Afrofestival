import { EVENT } from './constants';

/** Editable, database-backed event configuration. Field names mirror the
 *  former hard-coded EVENT constant so components read them the same way. */
export interface EventConfig {
  eventId: string | null;
  name: string;
  shortName: string;
  tagline: string;
  city: string;
  timezone: string;
  currency: string;
  provisionalDate: string;
  backupDate: string;
  capacityTarget: number;
  teams: number;
  groups: number;
  playersMin: number;
  playersMax: number;
  pitches: number;
  slotMinutes: number;
  maxPlayerFee: number;
  maxTicketPrice: number;
  sponsorCashGoal: number;
  sponsorInkindGoal: number;
  workingBudget: number;
}

/** Fallback used before data loads and on public pages missing private keys. */
export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventId: null,
  ...EVENT,
};

interface EventRow {
  id: string;
  name: string | null;
  tagline: string | null;
  location: string | null;
  timezone: string | null;
  currency: string | null;
  provisional_date: string | null;
  backup_date: string | null;
  capacity_target: number | null;
}
interface SettingRow {
  key: string;
  value: Record<string, unknown>;
}

const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Merge a DB event row + settings rows over the defaults. */
export function buildEventConfig(event: EventRow | null, settings: SettingRow[]): EventConfig {
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value ?? {}]));
  const t = byKey['tournament'] ?? {};
  const f = byKey['finance'] ?? {};
  const d = DEFAULT_EVENT_CONFIG;

  return {
    eventId: event?.id ?? null,
    name: event?.name || d.name,
    shortName: event?.name ? event.name.split(' ').slice(0, 2).join(' ') : d.shortName,
    tagline: event?.tagline || d.tagline,
    city: event?.location || d.city,
    timezone: event?.timezone || d.timezone,
    currency: event?.currency || d.currency,
    provisionalDate: event?.provisional_date || d.provisionalDate,
    backupDate: event?.backup_date || d.backupDate,
    capacityTarget: num(event?.capacity_target, d.capacityTarget),
    teams: num(t['teams'], d.teams),
    groups: num(t['groups'], d.groups),
    playersMin: num(t['players_min'], d.playersMin),
    playersMax: num(t['players_max'], d.playersMax),
    pitches: num(t['pitches'], d.pitches),
    slotMinutes: num(t['slot_minutes'], d.slotMinutes),
    maxPlayerFee: num(f['max_player_fee'] ?? t['max_player_fee'], d.maxPlayerFee),
    maxTicketPrice: num(f['max_ticket_price'], d.maxTicketPrice),
    sponsorCashGoal: num(f['sponsor_cash_goal'], d.sponsorCashGoal),
    sponsorInkindGoal: num(f['sponsor_inkind_goal'], d.sponsorInkindGoal),
    workingBudget: num(f['working_budget'], d.workingBudget),
  };
}
