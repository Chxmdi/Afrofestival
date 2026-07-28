import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Plus, Search, Download, LayoutGrid, Table2, PieChart } from 'lucide-react';
import { useRows, useInsert, useUpdate } from '@/lib/hooks';
import { SPONSOR_STAGES, SPONSOR_STAGE_MAP } from '@/lib/constants';
import { useEventConfig } from '@/config/EventConfigProvider';
import { money, compactMoney, percent, downloadCSV, formatDate } from '@/lib/format';
import type { SponsorProspect } from '@/types/db';
import { Card, SectionTitle, Spinner, ErrorState, EmptyState, Badge, Meter, StatCard, Progress } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Organization', required: true, colSpan: 2 },
  { name: 'website', label: 'Website', type: 'url' },
  { name: 'industry', label: 'Industry' },
  { name: 'location', label: 'Location' },
  { name: 'stage', label: 'Stage', type: 'select', options: SPONSOR_STAGES.map((s) => ({ value: s.value, label: s.label })) },
  { name: 'match_score', label: 'Match Score (0-100)', type: 'number', min: 0, max: 100 },
  { name: 'suggested_ask', label: 'Suggested Ask (CAD)', type: 'money', min: 0 },
  { name: 'probability', label: 'Probability (0-1)', type: 'number', min: 0, max: 1 },
  { name: 'next_action', label: 'Next Action' },
  { name: 'next_action_date', label: 'Next Action Date', type: 'date' },
  { name: 'commitment_type', label: 'Commitment', type: 'select', options: [{ value: 'cash', label: 'Cash' }, { value: 'in_kind', label: 'In-kind' }, { value: 'mixed', label: 'Mixed' }, { value: 'none', label: 'None' }] },
  { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  { name: 'internal_notes', label: 'Internal Notes', type: 'textarea', colSpan: 2 },
];

type Tab = 'pipeline' | 'table' | 'analytics';

export function Sponsors() {
  const navigate = useNavigate();
  const { config: EVENT } = useEventConfig();
  const { canEdit } = useAuth();
  const { data = [], isLoading, error, refetch } = useRows<SponsorProspect>('sponsor_prospects', { order: { column: 'match_score', ascending: false } });
  const insert = useInsert('sponsor_prospects');
  const update = useUpdate('sponsor_prospects');
  const [tab, setTab] = useState<Tab>('pipeline');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? data.filter((s) => `${s.name} ${s.industry} ${s.location}`.toLowerCase().includes(q)) : data;
  }, [data, search]);

  const totals = useMemo(() => {
    const active = data.filter((s) => !['lost'].includes(s.stage));
    const weighted = active.reduce((a, s) => a + Number(s.weighted_value ?? 0), 0);
    const won = data.filter((s) => ['won', 'contracted'].includes(s.stage)).reduce((a, s) => a + Number(s.suggested_ask ?? 0), 0);
    return { count: data.length, weighted, won, ask: active.reduce((a, s) => a + Number(s.suggested_ask ?? 0), 0) };
  }, [data]);

  const submit = async (values: FormValues) => {
    setFormError(null);
    try { await insert.mutateAsync(values); setAdding(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : String(e)); }
  };

  const columns: Column<SponsorProspect>[] = [
    { key: 'name', header: 'Organization', sortable: true, render: (r) => (
      <div className="flex items-center gap-2">
        <div>
          <p className="font-medium text-cream-50">{r.name}</p>
          <p className="text-2xs text-ink-400">{r.industry ?? '—'} · {r.location ?? '—'}</p>
        </div>
        {r.is_sample && <Badge color="#c99a2c">SAMPLE</Badge>}
      </div>
    ) },
    { key: 'stage', header: 'Stage', sortable: true, accessor: (r) => r.stage, render: (r) => <Badge color={SPONSOR_STAGE_MAP[r.stage]?.color}>{SPONSOR_STAGE_MAP[r.stage]?.label}</Badge> },
    { key: 'match_score', header: 'Match', sortable: true, accessor: (r) => r.match_score ?? 0, render: (r) => <Meter score={r.match_score} /> },
    { key: 'suggested_ask', header: 'Ask', sortable: true, accessor: (r) => r.suggested_ask ?? 0, align: 'right', render: (r) => <span className="tabular-nums">{money(r.suggested_ask)}</span> },
    { key: 'probability', header: 'Prob.', sortable: true, accessor: (r) => r.probability, align: 'right', render: (r) => percent(r.probability) },
    { key: 'weighted_value', header: 'Weighted', sortable: true, accessor: (r) => r.weighted_value ?? 0, align: 'right', render: (r) => <span className="tabular-nums text-forest-300">{money(r.weighted_value)}</span> },
    { key: 'next_action_date', header: 'Next action', sortable: true, accessor: (r) => r.next_action_date ?? '', render: (r) => <span className="text-xs">{r.next_action ? `${r.next_action}` : '—'}<br /><span className="text-ink-500">{formatDate(r.next_action_date)}</span></span> },
  ];

  const stageCounts = SPONSOR_STAGES.map((s) => ({ name: s.label, value: data.filter((d) => d.stage === s.value).length, color: s.color }));
  const stageWeighted = SPONSOR_STAGES.filter((s) => !['lost', 'won'].includes(s.value)).map((s) => ({
    name: s.label, value: data.filter((d) => d.stage === s.value).reduce((a, d) => a + Number(d.weighted_value ?? 0), 0), color: s.color,
  })).filter((s) => s.value > 0);

  return (
    <div className="space-y-5">
      <SectionTitle title="Sponsor CRM" subtitle="Pipeline, outreach and fulfilment for festival partners"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => downloadCSV('sponsors', rows as unknown as Record<string, unknown>[])}><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>
            {canEdit && <button className="btn-primary" onClick={() => { setFormError(null); setAdding(true); }}><Plus className="h-4 w-4" /> Add sponsor</button>}
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Prospects" value={totals.count} accent="gold" />
        <StatCard label="Secured / Goal" value={compactMoney(totals.won)} sub={<Progress value={totals.won} max={EVENT.sponsorCashGoal} tone="forest" />} accent="forest" />
        <StatCard label="Weighted Pipeline" value={compactMoney(totals.weighted)} sub="Probability-adjusted" accent="ember" />
        <StatCard label="Total Ask (open)" value={compactMoney(totals.ask)} accent="wine" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1">
          {([['pipeline', 'Pipeline', LayoutGrid], ['table', 'Table', Table2], ['analytics', 'Analytics', PieChart]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${tab === v ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab !== 'analytics' && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input className="input pl-9" placeholder="Search sponsors…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {isLoading ? <Card><Spinner /></Card>
        : error ? <Card><ErrorState error={error} retry={refetch} /></Card>
        : data.length === 0 ? <Card><EmptyState title="No sponsors yet" message="Add prospects or import them from Sponsor Discovery." action={canEdit ? <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add sponsor</button> : undefined} /></Card>
        : tab === 'table' ? (
          <DataTable rows={rows} columns={columns} onRowClick={(r) => navigate(`/sponsors/${r.id}`)} />
        ) : tab === 'pipeline' ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {SPONSOR_STAGES.filter((s) => s.value !== 'lost').map((stage) => {
              const items = rows.filter((r) => r.stage === stage.value);
              return (
                <div key={stage.value}
                  onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                  onDrop={() => { if (dragId && canEdit) { update.mutate({ id: dragId, values: { stage: stage.value } }); setDragId(null); } }}
                  className="w-64 shrink-0">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-cream-50">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} /> {stage.label}
                    </span>
                    <span className="text-2xs text-ink-500">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px] rounded-lg bg-ink-900/40 p-1.5">
                    {items.map((r) => (
                      <div key={r.id} draggable={canEdit} onDragStart={() => setDragId(r.id)} onDragEnd={() => setDragId(null)}
                        onClick={() => navigate(`/sponsors/${r.id}`)}
                        className="card !p-3 cursor-pointer hover:border-ink-500 active:cursor-grabbing">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-cream-50 leading-tight">{r.name}</p>
                          {r.is_sample && <span className="text-2xs text-gold-400">S</span>}
                        </div>
                        <p className="text-2xs text-ink-400 mt-0.5">{r.industry ?? '—'}</p>
                        <div className="mt-2"><Meter score={r.match_score} /></div>
                        <div className="mt-2 flex items-center justify-between text-2xs">
                          <span className="text-ink-400">{money(r.suggested_ask)}</span>
                          <span className="text-forest-300">{money(r.weighted_value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 pt-4"><h3 className="text-sm font-semibold text-cream-50">Prospects by stage</h3></div>
              <div className="p-2">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stageCounts} layout="vertical" margin={{ left: 20, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26282e" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9aa0a9', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#9aa0a9', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>{stageCounts.map((s, i) => <Cell key={i} fill={s.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 pt-4"><h3 className="text-sm font-semibold text-cream-50">Weighted value by stage</h3></div>
              <div className="p-2">
                {stageWeighted.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stageWeighted} margin={{ left: -8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#26282e" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#9aa0a9', fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#9aa0a9', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(v)} />
                      <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10 }} formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>{stageWeighted.map((s, i) => <Cell key={i} fill={s.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No pipeline value yet" />}
              </div>
            </Card>
          </div>
        )}

      <Modal open={adding} onClose={() => setAdding(false)} title="New sponsor prospect" size="lg">
        <DynamicForm fields={FIELDS} initial={{ stage: 'researching', probability: 0.1 }} onSubmit={submit} onCancel={() => setAdding(false)} error={formError} submitting={insert.isPending} />
      </Modal>
    </div>
  );
}
