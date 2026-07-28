import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Shield, Info, Save, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { useInsert, useDeleteRow } from '@/lib/hooks';
import { ALL_ROLES, ROLE_LABELS } from '@/lib/constants';
import { useEventConfig } from '@/config/EventConfigProvider';
import { useAuth } from '@/auth/AuthProvider';
import type { AppRole } from '@/types/db';
import type { EventConfig } from '@/lib/eventConfig';
import { Card, SectionTitle, Spinner, EmptyState, Badge, Avatar } from '@/components/ui';

interface Member { id: string; full_name: string | null; email: string | null; avatar_url: string | null; roles: AppRole[] }

// ---- Event configuration editor -------------------------------------
type FieldKind = 'text' | 'number' | 'date';
interface CfgField { key: keyof EventConfig; label: string; kind: FieldKind; help?: string }

const EVENT_FIELDS: CfgField[] = [
  { key: 'name', label: 'Event name', kind: 'text' },
  { key: 'tagline', label: 'Tagline', kind: 'text' },
  { key: 'city', label: 'Location', kind: 'text' },
  { key: 'timezone', label: 'Timezone', kind: 'text' },
  { key: 'currency', label: 'Currency', kind: 'text' },
  { key: 'provisionalDate', label: 'Provisional date', kind: 'date' },
  { key: 'backupDate', label: 'Backup date', kind: 'date' },
  { key: 'capacityTarget', label: 'Capacity target', kind: 'number' },
];
const TOURNAMENT_FIELDS: CfgField[] = [
  { key: 'teams', label: 'Number of teams', kind: 'number' },
  { key: 'groups', label: 'Number of groups', kind: 'number' },
  { key: 'playersMin', label: 'Players per team (min)', kind: 'number' },
  { key: 'playersMax', label: 'Players per team (max)', kind: 'number' },
  { key: 'pitches', label: 'Pitches', kind: 'number' },
  { key: 'slotMinutes', label: 'Slot length (minutes)', kind: 'number' },
];
const FINANCE_FIELDS: CfgField[] = [
  { key: 'workingBudget', label: 'Working budget (CAD)', kind: 'number' },
  { key: 'sponsorCashGoal', label: 'Sponsorship cash goal (CAD)', kind: 'number' },
  { key: 'sponsorInkindGoal', label: 'In-kind goal (CAD)', kind: 'number' },
  { key: 'maxPlayerFee', label: 'Max player fee (CAD)', kind: 'number', help: 'Enforced in the database' },
  { key: 'maxTicketPrice', label: 'Max ticket price (CAD)', kind: 'number' },
];

function EventConfigEditor() {
  const { config, refresh } = useEventConfig();
  const qc = useQueryClient();
  const [form, setForm] = useState<EventConfig>(config);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  // keep the form in sync when config loads/changes
  useEffect(() => { setForm(config); }, [config]);

  const set = (key: keyof EventConfig, kind: FieldKind, raw: string) =>
    setForm((f) => ({ ...f, [key]: kind === 'number' ? (raw === '' ? 0 : Number(raw)) : raw }));

  const save = async () => {
    setSaving(true); setStatus(null);
    try {
      // 1. Ensure an event row exists and update its core fields.
      let eventId = form.eventId;
      const eventPayload = {
        name: form.name, tagline: form.tagline, location: form.city,
        timezone: form.timezone, currency: form.currency,
        provisional_date: form.provisionalDate || null, backup_date: form.backupDate || null,
        capacity_target: form.capacityTarget,
      };
      if (eventId) {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('events')
          .insert({ ...eventPayload, slug: `event-${Date.now()}` }).select('id').single();
        if (error) throw error;
        eventId = (data as { id: string }).id;
      }

      // 2. Upsert the tournament + finance settings JSON.
      const tournamentVal = {
        teams: form.teams, groups: form.groups, players_min: form.playersMin,
        players_max: form.playersMax, pitches: form.pitches, slot_minutes: form.slotMinutes,
        max_player_fee: form.maxPlayerFee,
      };
      const financeVal = {
        currency: form.currency, working_budget: form.workingBudget,
        sponsor_cash_goal: form.sponsorCashGoal, sponsor_inkind_goal: form.sponsorInkindGoal,
        max_player_fee: form.maxPlayerFee, max_ticket_price: form.maxTicketPrice,
      };
      const { error: sErr } = await supabase.from('event_settings').upsert(
        [
          { event_id: eventId, key: 'tournament', value: tournamentVal },
          { event_id: eventId, key: 'finance', value: financeVal },
        ],
        { onConflict: 'event_id,key' },
      );
      if (sErr) throw sErr;

      refresh();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setStatus({ tone: 'ok', msg: 'Configuration saved. Every module now uses these values.' });
    } catch (e) {
      setStatus({ tone: 'err', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const Group = ({ title, fields }: { title: string; fields: CfgField[] }) => (
    <div>
      <p className="text-2xs uppercase tracking-wider text-ink-400 mb-2">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {fields.map((f) => (
          <div key={String(f.key)} className={f.kind === 'text' && (f.key === 'name' || f.key === 'tagline') ? 'col-span-2' : ''}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : 'text'}
              min={f.kind === 'number' ? 0 : undefined}
              value={String(form[f.key] ?? '')}
              onChange={(e) => set(f.key, f.kind, e.target.value)}
            />
            {f.help && <p className="mt-1 text-2xs text-ink-500">{f.help}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-cream-50">Event configuration</h3>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <div className="space-y-5">
        <Group title="Event" fields={EVENT_FIELDS} />
        <Group title="Tournament format" fields={TOURNAMENT_FIELDS} />
        <Group title="Finance targets & pricing" fields={FINANCE_FIELDS} />
      </div>
      {status && (
        <p className={`mt-4 text-sm ${status.tone === 'ok' ? 'text-forest-300' : 'text-ember-400'}`}>{status.msg}</p>
      )}
      <p className="mt-3 text-2xs text-ink-500">
        These values drive the dashboard, tournament, finance and public forms in real time. The max player fee is
        also enforced by a database trigger, so lowering it will reject any player priced above the new limit.
      </p>
    </Card>
  );
}

// ---- Team & roles ----------------------------------------------------
export function Settings() {
  const { isAdmin, hasRole } = useAuth();
  const canEditConfig = isAdmin || hasRole(['event_director']);
  const insertRole = useInsert('user_roles');
  const deleteRole = useDeleteRow('user_roles');
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  const { data: members = [], isLoading, refetch } = useQuery<Member[]>({
    queryKey: ['team-members'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,avatar_url').order('full_name'),
        supabase.from('user_roles').select('id,user_id,role'),
      ]);
      const roleMap: Record<string, AppRole[]> = {};
      (roles ?? []).forEach((r) => { const rr = r as { user_id: string; role: AppRole }; (roleMap[rr.user_id] ??= []).push(rr.role); });
      return (profiles ?? []).map((p) => {
        const pp = p as { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
        return { ...pp, roles: roleMap[pp.id] ?? [] };
      });
    },
  });

  const roleRowId = async (userId: string, role: AppRole): Promise<string | null> => {
    const { data } = await supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', role).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  };
  const addRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) return;
    await insertRole.mutateAsync({ user_id: userId, role });
    refetch();
  };
  const removeRole = async (userId: string, role: AppRole) => {
    const id = await roleRowId(userId, role);
    if (id) { await deleteRole.mutateAsync(id); refetch(); }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Settings" subtitle="Team, roles and event configuration" />

      <Card className="!py-3">
        <div className="flex items-start gap-2 text-xs text-ink-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-gold-400" />
          <span>New teammates sign up on the login screen (the first account becomes Owner / Admin). Admins then assign roles below. Row-level security enforces every role — viewers are read-only, finance data is restricted to Finance Lead / Directors, and internal records are never publicly readable.</span>
        </div>
      </Card>

      {canEditConfig ? <EventConfigEditor /> : (
        <Card><EmptyState title="Configuration is admin-only" message="Ask an Owner / Admin or Event Director to change event settings." /></Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3">
          <Shield className="h-4 w-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-cream-50">Team members & roles</h3>
        </div>
        {isLoading ? <Spinner /> : members.length === 0 ? <EmptyState title="No team members yet" /> : (
          <div className="divide-y divide-ink-800/70">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={m.full_name ?? m.email} url={m.avatar_url} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream-50 truncate">{m.full_name ?? 'Unnamed'}</p>
                    <p className="text-2xs text-ink-400 truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.roles.length === 0 && <span className="text-2xs text-ink-500">No role</span>}
                  {m.roles.map((r) => (
                    <span key={r} className="badge bg-forest-700/40 text-forest-300">
                      {ROLE_LABELS[r]}
                      {isAdmin && <button className="ml-1 hover:text-ember-400" onClick={() => removeRole(m.id, r)}><X className="h-3 w-3" /></button>}
                    </span>
                  ))}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <select className="input !py-1 !w-auto text-xs" value={selectedRole[m.id] ?? ''} onChange={(e) => setSelectedRole((s) => ({ ...s, [m.id]: e.target.value as AppRole }))}>
                        <option value="">Add role…</option>
                        {ALL_ROLES.filter((r) => !m.roles.includes(r)).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <button className="btn-secondary !px-2 !py-1" onClick={() => addRole(m.id)} disabled={!selectedRole[m.id]}><UserPlus className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-cream-50 mb-3">Roles</h3>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ROLES.map((r) => <Badge key={r} color="#c99a2c">{ROLE_LABELS[r]}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
