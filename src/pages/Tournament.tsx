import { useMemo, useState } from 'react';
import { Trophy, Users, ClipboardList, Award, Shirt } from 'lucide-react';
import { useRows, useInsert, useUpdate } from '@/lib/hooks';
import { EVENT } from '@/lib/constants';
import { money, titleCase, formatDateTime } from '@/lib/format';
import { Card, SectionTitle, Spinner, ErrorState, EmptyState, Badge, StatCard, Progress } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

interface Team { id: string; name: string; represents: string | null; neighbourhood: string | null; captain_name: string | null; registration_status: string; payment_status: string; registration_fee: number; amount_paid: number; eligibility_ok: boolean; color_primary: string | null; is_sample?: boolean }
interface Group { id: string; name: string; sort_order: number }
interface GroupMember { group_id: string; team_id: string; seed: number | null }
interface Fixture { id: string; stage: string; group_id: string | null; round: number | null; pitch: number | null; kickoff: string | null; home_team_id: string | null; away_team_id: string | null; home_label: string | null; away_label: string | null; home_score: number | null; away_score: number | null; status: string }
interface AwardRow { id: string; category: string; recipient_name: string | null; awarded: boolean }

const TEAM_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Team Name', required: true, colSpan: 2 },
  { name: 'represents', label: 'Represents (country/community)' },
  { name: 'neighbourhood', label: 'Neighbourhood' },
  { name: 'captain_name', label: 'Captain' },
  { name: 'captain_email', label: 'Captain Email', type: 'email' },
  { name: 'manager_name', label: 'Manager' },
  { name: 'color_primary', label: 'Primary Colour', placeholder: '#227d4f' },
  { name: 'registration_fee', label: 'Registration Fee (CAD)', type: 'money', min: 0 },
  { name: 'amount_paid', label: 'Amount Paid (CAD)', type: 'money', min: 0 },
  { name: 'registration_status', label: 'Status', type: 'select', options: ['pending', 'approved', 'waitlisted', 'withdrawn'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'payment_status', label: 'Payment', type: 'select', options: ['unpaid', 'partial', 'paid'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'eligibility_ok', label: 'Eligibility confirmed', type: 'boolean' },
];

type Tab = 'teams' | 'groups' | 'fixtures' | 'awards';

export function Tournament() {
  const { canEdit } = useAuth();
  const [tab, setTab] = useState<Tab>('teams');
  const { data: teams = [], isLoading, error, refetch } = useRows<Team>('teams', { order: { column: 'name' } });
  const { data: groups = [] } = useRows<Group>('tournament_groups', { order: { column: 'sort_order' } });
  const { data: members = [] } = useRows<GroupMember>('group_members');
  const { data: fixtures = [] } = useRows<Fixture>('fixtures', { order: { column: 'kickoff' } });
  const { data: awards = [] } = useRows<AwardRow>('awards');
  const { data: players = [] } = useRows<{ team_id: string }>('players', { select: 'team_id' });
  const insertTeam = useInsert('teams');
  const updateTeam = useUpdate('teams');
  const updateFixture = useUpdate('fixtures');
  const updateAward = useUpdate('awards');
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const rosterCount = useMemo(() => { const c: Record<string, number> = {}; players.forEach((p) => { c[p.team_id] = (c[p.team_id] ?? 0) + 1; }); return c; }, [players]);

  // Live standings from completed group fixtures
  const standings = useMemo(() => {
    const table: Record<string, Record<string, { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }>> = {};
    groups.forEach((g) => {
      table[g.id] = {};
      members.filter((m) => m.group_id === g.id).forEach((m) => { table[g.id][m.team_id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    });
    fixtures.filter((f) => f.stage === 'group' && f.group_id && f.home_team_id && f.away_team_id && f.home_score != null && f.away_score != null).forEach((f) => {
      const t = table[f.group_id!]; if (!t) return;
      const h = t[f.home_team_id!]; const a = t[f.away_team_id!]; if (!h || !a) return;
      h.p++; a.p++; h.gf += f.home_score!; h.ga += f.away_score!; a.gf += f.away_score!; a.ga += f.home_score!;
      if (f.home_score! > f.away_score!) { h.w++; a.l++; h.pts += 3; }
      else if (f.home_score! < f.away_score!) { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    return table;
  }, [groups, members, fixtures]);

  const submitTeam = async (values: Record<string, unknown>) => {
    setFormError(null);
    try {
      if (editing === 'new') await insertTeam.mutateAsync(values);
      else if (editing) await updateTeam.mutateAsync({ id: editing.id, values });
      setEditing(null);
    } catch (e) { setFormError(e instanceof Error ? e.message : String(e)); }
  };

  const teamColumns: Column<Team>[] = [
    { key: 'name', header: 'Team', sortable: true, render: (t) => (
      <div className="flex items-center gap-2">
        <span className="h-6 w-1.5 rounded-full" style={{ background: t.color_primary ?? '#484c55' }} />
        <div><p className="font-medium text-cream-50">{t.name}</p><p className="text-2xs text-ink-400">{t.represents ?? '—'} · {t.neighbourhood ?? '—'}</p></div>
        {t.is_sample && <Badge color="#c99a2c">SAMPLE</Badge>}
      </div>
    ) },
    { key: 'roster', header: 'Roster', align: 'center', render: (t) => <span className={rosterCount[t.id] >= EVENT.playersMin ? 'text-forest-300' : 'text-ember-400'}>{rosterCount[t.id] ?? 0}/{EVENT.playersMax}</span> },
    { key: 'registration_status', header: 'Registration', sortable: true, render: (t) => <Badge color={t.registration_status === 'approved' ? '#227d4f' : t.registration_status === 'waitlisted' ? '#e87c3f' : '#6b7079'}>{titleCase(t.registration_status)}</Badge> },
    { key: 'payment', header: 'Payment', render: (t) => <span className="text-xs">{money(t.amount_paid)} / {money(t.registration_fee)} <Badge color={t.payment_status === 'paid' ? '#227d4f' : t.payment_status === 'partial' ? '#c99a2c' : '#a02c4a'}>{titleCase(t.payment_status)}</Badge></span> },
    { key: 'eligibility_ok', header: 'Eligible', align: 'center', render: (t) => t.eligibility_ok ? <span className="text-forest-400">✓</span> : <span className="text-ink-500">—</span> },
  ];

  const label = (f: Fixture, side: 'home' | 'away') => {
    const id = side === 'home' ? f.home_team_id : f.away_team_id;
    const lbl = side === 'home' ? f.home_label : f.away_label;
    return id ? teamMap[id]?.name ?? 'TBD' : lbl ?? 'TBD';
  };

  const byStage = (stage: string) => fixtures.filter((f) => f.stage === stage);
  const approved = teams.filter((t) => t.registration_status === 'approved').length;

  return (
    <div className="space-y-5">
      <SectionTitle title="Tournament" subtitle={`${EVENT.teams} teams · ${EVENT.groups} groups of 4 · four pitches · ${EVENT.slotMinutes}-min slots`}
        action={canEdit && tab === 'teams' && <button className="btn-primary" onClick={() => { setFormError(null); setEditing('new'); }}><Trophy className="h-4 w-4" /> Add team</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Teams Registered" value={`${approved}/${EVENT.teams}`} sub={<Progress value={approved} max={EVENT.teams} tone="ember" />} accent="ember" icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Players" value={players.length} accent="gold" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Fixtures" value={fixtures.length} sub={`${byStage('group').length} group · ${fixtures.length - byStage('group').length} knockout`} accent="forest" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Max Player Fee" value={money(EVENT.maxPlayerFee)} sub="Enforced in database" accent="wine" icon={<Shirt className="h-4 w-4" />} />
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-ink-700 bg-ink-900 p-1">
        {([['teams', 'Teams'], ['groups', 'Groups & Standings'], ['fixtures', 'Fixtures & Results'], ['awards', 'Awards']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-md px-3 py-1.5 text-sm ${tab === v ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>{l}</button>
        ))}
      </div>

      {isLoading ? <Card><Spinner /></Card> : error ? <Card><ErrorState error={error} retry={refetch} /></Card> : tab === 'teams' ? (
        <DataTable rows={teams} columns={teamColumns} onRowClick={canEdit ? (t) => { setFormError(null); setEditing(t); } : undefined} empty={<Card><EmptyState title="No teams registered" /></Card>} />
      ) : tab === 'groups' ? (
        groups.length === 0 ? <Card><EmptyState title="No groups drawn yet" /></Card> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => {
              const rows = Object.entries(standings[g.id] ?? {}).map(([teamId, s]) => ({ teamId, ...s, gd: s.gf - s.ga }))
                .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
              return (
                <Card key={g.id} className="!p-0 overflow-hidden">
                  <div className="border-b border-ink-700 px-4 py-2.5"><h3 className="text-sm font-semibold text-cream-50">{g.name}</h3></div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-2xs uppercase text-ink-500"><th className="text-left px-4 py-2">Team</th><th className="px-2">P</th><th className="px-2">W</th><th className="px-2">D</th><th className="px-2">L</th><th className="px-2">GD</th><th className="px-3 text-right">Pts</th></tr></thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.teamId} className="border-t border-ink-800/70">
                          <td className="px-4 py-2 text-cream-50"><span className="text-ink-500 mr-2">{i + 1}</span>{teamMap[r.teamId]?.name ?? '—'}</td>
                          <td className="text-center text-ink-300">{r.p}</td><td className="text-center text-ink-300">{r.w}</td><td className="text-center text-ink-300">{r.d}</td><td className="text-center text-ink-300">{r.l}</td>
                          <td className="text-center text-ink-300">{r.gd > 0 ? '+' : ''}{r.gd}</td><td className="px-3 text-right font-semibold text-cream-50">{r.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}
            <p className="md:col-span-2 text-2xs text-ink-500">Tie-breakers (configurable): points → goal difference → goals for. Standings recalculate automatically from entered results.</p>
          </div>
        )
      ) : tab === 'fixtures' ? (
        <div className="space-y-4">
          {['group', 'quarterfinal', 'semifinal', 'third_place', 'final'].map((stage) => {
            const list = byStage(stage);
            if (!list.length) return null;
            return (
              <Card key={stage} className="!p-0 overflow-hidden">
                <div className="border-b border-ink-700 px-5 py-3"><h3 className="text-sm font-semibold text-cream-50">{titleCase(stage)} <span className="text-ink-500">· {list.length}</span></h3></div>
                <div className="divide-y divide-ink-800/70">
                  {list.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                      <span className="w-24 text-2xs text-ink-500">{f.pitch ? `Pitch ${f.pitch}` : ''}{f.kickoff ? ` · ${formatDateTime(f.kickoff).split('·')[1] ?? ''}` : ''}</span>
                      <span className="flex-1 text-right text-cream-50 truncate">{label(f, 'home')}</span>
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" className="input !w-12 !px-1 text-center" defaultValue={f.home_score ?? ''} onBlur={(e) => updateFixture.mutate({ id: f.id, values: { home_score: e.target.value === '' ? null : Number(e.target.value), status: e.target.value !== '' && f.away_score != null ? 'completed' : f.status } })} />
                          <span className="text-ink-500">–</span>
                          <input type="number" min="0" className="input !w-12 !px-1 text-center" defaultValue={f.away_score ?? ''} onBlur={(e) => updateFixture.mutate({ id: f.id, values: { away_score: e.target.value === '' ? null : Number(e.target.value), status: e.target.value !== '' && f.home_score != null ? 'completed' : f.status } })} />
                        </div>
                      ) : (
                        <span className="tabular-nums text-cream-50 w-14 text-center">{f.home_score ?? '–'} : {f.away_score ?? '–'}</span>
                      )}
                      <span className="flex-1 text-cream-50 truncate">{label(f, 'away')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {fixtures.length === 0 && <Card><EmptyState title="No fixtures yet" message="Fixtures are generated from the group draw." /></Card>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {awards.map((a) => (
            <Card key={a.id} className="flex items-center gap-3">
              <Award className={`h-6 w-6 ${a.awarded ? 'text-gold-400' : 'text-ink-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-cream-50">{a.category}</p>
                {canEdit ? (
                  <input className="input !py-1 mt-1" placeholder="Recipient…" defaultValue={a.recipient_name ?? ''} onBlur={(e) => updateAward.mutate({ id: a.id, values: { recipient_name: e.target.value, awarded: Boolean(e.target.value) } })} />
                ) : <p className="text-xs text-ink-400">{a.recipient_name ?? 'Not yet awarded'}</p>}
              </div>
            </Card>
          ))}
          {awards.length === 0 && <Card><EmptyState title="No awards configured" /></Card>}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Register team' : 'Edit team'} size="lg">
        {editing !== null && (
          <DynamicForm fields={TEAM_FIELDS} initial={editing === 'new' ? { registration_status: 'pending', payment_status: 'unpaid', registration_fee: 450 } : (editing as unknown as Record<string, unknown>)}
            error={formError} submitting={insertTeam.isPending || updateTeam.isPending} onCancel={() => setEditing(null)} onSubmit={submitTeam} />
        )}
      </Modal>
    </div>
  );
}
