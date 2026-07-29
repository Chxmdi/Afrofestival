import type { AppRole, SponsorStage } from '@/types/db';

export const EVENT = {
  name: 'Ojoro Afro Football & Culture Festival',
  shortName: 'Ojoro Festival',
  tagline: 'Where the beautiful game meets Black culture',
  city: 'Montréal, Québec',
  timezone: 'America/Montreal',
  currency: 'CAD',
  provisionalDate: '2027-07-17',
  backupDate: '2027-07-24',
  capacityTarget: 600,
  teams: 16,
  groups: 4,
  playersMin: 10,
  playersMax: 12,
  pitches: 4,
  slotMinutes: 30,
  maxPlayerFee: 45,
  maxTicketPrice: 45,
  sponsorCashGoal: 32000,
  sponsorInkindGoal: 10000,
  workingBudget: 55500,
} as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  owner_admin: 'Owner / Admin',
  event_director: 'Event Director',
  sponsorship_lead: 'Sponsorship Lead',
  vendor_lead: 'Vendor Lead',
  tournament_director: 'Tournament Director',
  finance_lead: 'Finance Lead',
  marketing_lead: 'Marketing Lead',
  volunteer_coordinator: 'Volunteer Coordinator',
  viewer: 'Viewer',
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export const SPONSOR_STAGES: { value: SponsorStage; label: string; color: string }[] = [
  { value: 'researching', label: 'Researching', color: '#6b7079' },
  { value: 'qualified', label: 'Qualified', color: '#9aa0a9' },
  { value: 'contact_identified', label: 'Contact Identified', color: '#c99a2c' },
  { value: 'ready_to_contact', label: 'Ready to Contact', color: '#e0b64d' },
  { value: 'contacted', label: 'Contacted', color: '#e87c3f' },
  { value: 'meeting', label: 'Meeting', color: '#d75f24' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: '#b1481a' },
  { value: 'negotiation', label: 'Negotiation', color: '#a02c4a' },
  { value: 'verbal_yes', label: 'Verbal Yes', color: '#3a9a68' },
  { value: 'contracted', label: 'Contracted', color: '#227d4f' },
  { value: 'won', label: 'Won', color: '#164a31' },
  { value: 'lost', label: 'Lost', color: '#651a2c' },
  { value: 'on_hold', label: 'On Hold', color: '#33363d' },
];

export const SPONSOR_STAGE_MAP = Object.fromEntries(
  SPONSOR_STAGES.map((s) => [s.value, s]),
) as Record<SponsorStage, (typeof SPONSOR_STAGES)[number]>;

export const TASK_STATUSES = [
  { value: 'todo', label: 'To Do', color: '#6b7079' },
  { value: 'in_progress', label: 'In Progress', color: '#e0b64d' },
  { value: 'blocked', label: 'Blocked', color: '#a02c4a' },
  { value: 'review', label: 'Review', color: '#e87c3f' },
  { value: 'done', label: 'Done', color: '#227d4f' },
  { value: 'cancelled', label: 'Cancelled', color: '#33363d' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6b7079' },
  { value: 'medium', label: 'Medium', color: '#c99a2c' },
  { value: 'high', label: 'High', color: '#e87c3f' },
  { value: 'critical', label: 'Critical', color: '#a02c4a' },
] as const;

export const VENDOR_CATEGORIES = [
  'Food', 'Beverage', 'Fashion', 'Beauty', 'Hair & Barbering',
  'Art', 'Jewellery', 'Community', 'Media', 'Other',
] as const;

export const PERFORMER_DISCIPLINES = [
  { value: 'dj', label: 'DJ' },
  { value: 'musician', label: 'Musician' },
  { value: 'dance_group', label: 'Dance Group' },
  { value: 'spoken_word', label: 'Spoken Word' },
  { value: 'visual_artist', label: 'Visual Artist' },
  { value: 'barber', label: 'Barber' },
  { value: 'host', label: 'Host / MC' },
  { value: 'freestyler', label: 'Football Freestyler' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'other', label: 'Other' },
] as const;

export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded', 'void'] as const;
