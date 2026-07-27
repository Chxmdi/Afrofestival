// Hand-maintained types for the tables the UI works with directly.
export type AppRole =
  | 'owner_admin' | 'event_director' | 'sponsorship_lead' | 'vendor_lead'
  | 'tournament_director' | 'finance_lead' | 'marketing_lead'
  | 'volunteer_coordinator' | 'viewer';

export type SponsorStage =
  | 'researching' | 'qualified' | 'contact_identified' | 'ready_to_contact'
  | 'contacted' | 'meeting' | 'proposal_sent' | 'negotiation' | 'verbal_yes'
  | 'contracted' | 'won' | 'lost' | 'on_hold';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type VendorStatus = 'submitted' | 'under_review' | 'approved' | 'waitlisted' | 'rejected' | 'withdrawn';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'void';
export type PermitStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'expired';

/** Common columns shared by most records. */
export interface BaseRow {
  id: string;
  created_at: string;
  updated_at?: string | null;
  is_sample?: boolean;
  archived_at?: string | null;
  [key: string]: unknown;
}

export interface Profile extends BaseRow {
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  title: string | null;
}

export interface UserRoleRow extends BaseRow {
  user_id: string;
  role: AppRole;
}

export interface SponsorProspect extends BaseRow {
  name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  stage: SponsorStage;
  match_score: number | null;
  score_breakdown: Record<string, number>;
  align_black_culture: number | null;
  align_football: number | null;
  align_montreal: number | null;
  align_youth: number | null;
  previous_sponsorship_evidence: string | null;
  suggested_package_id: string | null;
  suggested_ask: number | null;
  estimated_capacity: number | null;
  probability: number;
  weighted_value: number | null;
  main_contact_id: string | null;
  contact_source: string | null;
  contact_confidence: number | null;
  last_interaction_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  proposal_status: string;
  contract_status: string;
  commitment_type: string | null;
  internal_notes: string | null;
  owner_id: string | null;
}

export interface Team extends BaseRow {
  name: string;
  crest_url: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  represents: string | null;
  neighbourhood: string | null;
  captain_name: string | null;
  registration_status: string;
  payment_status: PaymentStatus;
  registration_fee: number;
  amount_paid: number;
  eligibility_ok: boolean;
}

export interface TaskRow extends BaseRow {
  title: string;
  description: string | null;
  department: string | null;
  phase: string | null;
  owner_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  estimated_cost: number | null;
  milestone_id: string | null;
  is_blocker: boolean;
  blocked_reason: string | null;
  on_critical_path: boolean;
}

export interface BudgetItem extends BaseRow {
  category_id: string;
  name: string;
  planned_amount: number;
  quoted_amount: number;
  committed_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  forecast_amount: number;
  variance: number | null;
}

export interface Notification extends BaseRow {
  user_id: string | null;
  title: string;
  body: string | null;
  level: 'info' | 'success' | 'warning' | 'critical';
  link: string | null;
  read: boolean;
}
