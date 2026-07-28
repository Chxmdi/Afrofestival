import { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Wallet, Plus, TrendingUp, Scale } from 'lucide-react';
import { useRows, useInsert, useUpdate } from '@/lib/hooks';
import { useEventConfig } from '@/config/EventConfigProvider';
import { money, compactMoney, titleCase } from '@/lib/format';
import { Card, SectionTitle, Spinner, ErrorState, EmptyState, Badge, StatCard, Progress } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

interface Category { id: string; name: string; kind: string; scenario: string; sort_order: number }
interface Item { id: string; category_id: string; name: string; planned_amount: number; quoted_amount: number; committed_amount: number; invoiced_amount: number; paid_amount: number; forecast_amount: number; variance: number | null }
interface Revenue { id: string; source_type: string; description: string; amount: number; status: string; is_in_kind: boolean }
interface Expense { id: string; description: string; amount: number; category: string | null; approval_status: string; payment_status: string; is_in_kind: boolean; expense_date: string }

const REV_FIELDS: FieldDef[] = [
  { name: 'source_type', label: 'Source', type: 'select', required: true, options: ['sponsors', 'team_registrations', 'tickets', 'vendors', 'merchandise', 'grants', 'donations'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'description', label: 'Description', required: true, colSpan: 2 },
  { name: 'amount', label: 'Amount (CAD)', type: 'money', required: true, min: 0 },
  { name: 'status', label: 'Status', type: 'select', options: ['expected', 'committed', 'received'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'is_in_kind', label: 'In-kind', type: 'boolean' },
];
const EXP_FIELDS: FieldDef[] = [
  { name: 'description', label: 'Description', required: true, colSpan: 2 },
  { name: 'amount', label: 'Amount (CAD)', type: 'money', required: true, min: 0 },
  { name: 'category', label: 'Category' },
  { name: 'expense_date', label: 'Date', type: 'date' },
  { name: 'approval_status', label: 'Approval', type: 'select', options: ['pending', 'approved', 'rejected'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'payment_status', label: 'Payment', type: 'select', options: ['unpaid', 'partial', 'paid'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'is_in_kind', label: 'In-kind', type: 'boolean' },
];

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0);

export function Finance() {
  const { config: EVENT } = useEventConfig();
  const { hasRole, isAdmin } = useAuth();
  const canEditFinance = isAdmin || hasRole(['finance_lead', 'event_director']);
  const [tab, setTab] = useState<'budget' | 'revenue' | 'expenses' | 'breakeven'>('budget');
  const [scenario, setScenario] = useState<'lean' | 'recommended' | 'premium'>('recommended');
  const { data: cats = [], isLoading, error, refetch } = useRows<Category>('budget_categories', { order: { column: 'sort_order' } });
  const { data: items = [] } = useRows<Item>('budget_items');
  const { data: revenues = [] } = useRows<Revenue>('revenues', { order: { column: 'created_at', ascending: false } });
  const { data: expenses = [] } = useRows<Expense>('expenses', { order: { column: 'expense_date', ascending: false } });
  const insertRev = useInsert('revenues');
  const insertExp = useInsert('expenses');
  const updateExp = useUpdate('expenses');
  const insertItem = useInsert('budget_items');
  const [modal, setModal] = useState<'rev' | 'exp' | 'item' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const scenarioCats = useMemo(() => cats.filter((c) => c.scenario === scenario), [cats, scenario]);
  const itemsByCat = useMemo(() => { const m: Record<string, Item[]> = {}; items.forEach((i) => { (m[i.category_id] ??= []).push(i); }); return m; }, [items]);

  const expenseTotals = useMemo(() => {
    const expCats = new Set(scenarioCats.filter((c) => c.kind === 'expense').map((c) => c.id));
    const exp = items.filter((i) => expCats.has(i.category_id));
    return {
      planned: sum(exp.map((i) => i.planned_amount)), committed: sum(exp.map((i) => i.committed_amount)),
      paid: sum(exp.map((i) => i.paid_amount)), forecast: sum(exp.map((i) => i.forecast_amount)),
      variance: sum(exp.map((i) => Number(i.variance ?? 0))),
    };
  }, [items, scenarioCats]);

  const revenueTotals = useMemo(() => {
    const revCats = new Set(scenarioCats.filter((c) => c.kind === 'revenue').map((c) => c.id));
    const rev = items.filter((i) => revCats.has(i.category_id));
    return { planned: sum(rev.map((i) => i.planned_amount)), forecast: sum(rev.map((i) => i.forecast_amount)) };
  }, [items, scenarioCats]);

  const ledgerRevenue = sum(revenues.filter((r) => !r.is_in_kind).map((r) => r.amount));
  const ledgerExpense = sum(expenses.filter((e) => !e.is_in_kind).map((e) => e.amount));

  // Break-even calculator
  const [ticketPrice, setTicketPrice] = useState(20);
  const [attendance, setAttendance] = useState(Math.round(EVENT.capacityTarget * 0.7));
  const fixedCosts = expenseTotals.planned;
  const nonTicketRevenue = revenueTotals.forecast - (revenueTotals.forecast * 0); // forecast revenue excl tickets approximation
  const ticketRevenue = ticketPrice * attendance;
  const breakEvenTickets = ticketPrice > 0 ? Math.max(0, Math.ceil((fixedCosts - (nonTicketRevenue)) / ticketPrice)) : 0;
  const projectedNet = ticketRevenue + nonTicketRevenue - fixedCosts;

  const budgetChart = scenarioCats.filter((c) => c.kind === 'expense').map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
    value: sum((itemsByCat[c.id] ?? []).map((i) => i.planned_amount)),
  })).filter((d) => d.value > 0);

  const revColumns: Column<Revenue>[] = [
    { key: 'description', header: 'Revenue', sortable: true, render: (r) => <span className="text-cream-50">{r.description}{r.is_in_kind && <Badge color="#c99a2c" className="ml-2">In-kind</Badge>}</span> },
    { key: 'source_type', header: 'Source', sortable: true, render: (r) => <Badge color="#3a9a68">{titleCase(r.source_type)}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'received' ? '#227d4f' : r.status === 'committed' ? '#c99a2c' : '#6b7079'}>{titleCase(r.status)}</Badge> },
    { key: 'amount', header: 'Amount', sortable: true, accessor: (r) => r.amount, align: 'right', render: (r) => <span className="tabular-nums text-forest-300">{money(r.amount)}</span> },
  ];
  const expColumns: Column<Expense>[] = [
    { key: 'description', header: 'Expense', sortable: true, render: (e) => <span className="text-cream-50">{e.description}{e.is_in_kind && <Badge color="#c99a2c" className="ml-2">In-kind</Badge>}</span> },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'approval_status', header: 'Approval', render: (e) => canEditFinance ? (
      <select className="input !py-1 !w-auto" defaultValue={e.approval_status} onChange={(ev) => updateExp.mutate({ id: e.id, values: { approval_status: ev.target.value } })} onClick={(ev) => ev.stopPropagation()}>
        {['pending', 'approved', 'rejected'].map((v) => <option key={v} value={v}>{titleCase(v)}</option>)}
      </select>
    ) : <Badge color={e.approval_status === 'approved' ? '#227d4f' : e.approval_status === 'rejected' ? '#a02c4a' : '#c99a2c'}>{titleCase(e.approval_status)}</Badge> },
    { key: 'payment_status', header: 'Payment', render: (e) => <Badge color={e.payment_status === 'paid' ? '#227d4f' : e.payment_status === 'partial' ? '#c99a2c' : '#a02c4a'}>{titleCase(e.payment_status)}</Badge> },
    { key: 'amount', header: 'Amount', sortable: true, accessor: (e) => e.amount, align: 'right', render: (e) => <span className="tabular-nums text-ember-300">{money(e.amount)}</span> },
  ];

  return (
    <div className="space-y-5">
      <SectionTitle title="Finance" subtitle={`Budget scenarios, ledgers and forecasting · working budget ${money(EVENT.workingBudget)} · all ${EVENT.currency}`}
        action={
          <div className="flex gap-2 items-center">
            <select className="input !w-auto" value={scenario} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
              <option value="lean">Lean</option><option value="recommended">Recommended</option><option value="premium">Premium</option>
            </select>
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Planned Expenses" value={compactMoney(expenseTotals.planned)} sub={`Working budget ${compactMoney(EVENT.workingBudget)}`} accent="gold" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Planned Revenue" value={compactMoney(revenueTotals.planned)} sub={`Forecast ${compactMoney(revenueTotals.forecast)}`} accent="forest" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Paid to date" value={compactMoney(expenseTotals.paid)} sub={`Committed ${compactMoney(expenseTotals.committed)}`} accent="wine" />
        <StatCard label="Forecast Variance" value={compactMoney(expenseTotals.variance)} sub={expenseTotals.variance > 0 ? 'Over plan' : 'Within plan'} accent={expenseTotals.variance > 0 ? 'ember' : 'forest'} />
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-ink-700 bg-ink-900 p-1">
        {([['budget', 'Budget'], ['revenue', 'Revenue'], ['expenses', 'Expenses'], ['breakeven', 'Break-even']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-md px-3 py-1.5 text-sm ${tab === v ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>{l}</button>
        ))}
      </div>

      {isLoading ? <Card><Spinner /></Card> : error ? <Card><ErrorState error={error} retry={refetch} /></Card> : tab === 'budget' ? (
        <div className="space-y-4">
          {canEditFinance && <div className="flex justify-end"><button className="btn-secondary" onClick={() => { setFormError(null); setModal('item'); }}><Plus className="h-4 w-4" /> Add budget line</button></div>}
          {scenarioCats.length === 0 ? <Card><EmptyState title={`No ${scenario} budget yet`} message="Seed data ships a recommended scenario. Add lines to build others." /></Card> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                {['expense', 'revenue'].map((kind) => {
                  const kc = scenarioCats.filter((c) => c.kind === kind);
                  if (!kc.length) return null;
                  return (
                    <Card key={kind} className="!p-0 overflow-hidden">
                      <div className="border-b border-ink-700 px-4 py-2.5 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-cream-50">{titleCase(kind)}s</h3>
                        <span className="text-xs text-ink-400">{compactMoney(sum(kc.flatMap((c) => (itemsByCat[c.id] ?? []).map((i) => i.planned_amount))))}</span>
                      </div>
                      <div className="table-wrap !border-0 !rounded-none overflow-x-auto">
                        <table className="data-table">
                          <thead><tr><th>Line</th><th className="text-right">Planned</th><th className="text-right">Committed</th><th className="text-right">Paid</th><th className="text-right">Forecast</th><th className="text-right">Var.</th></tr></thead>
                          <tbody>
                            {kc.map((c) => (itemsByCat[c.id] ?? []).map((i) => (
                              <tr key={i.id}>
                                <td><span className="text-2xs text-ink-500 block">{c.name}</span>{i.name}</td>
                                <td className="text-right tabular-nums">{money(i.planned_amount)}</td>
                                <td className="text-right tabular-nums text-ink-300">{money(i.committed_amount)}</td>
                                <td className="text-right tabular-nums text-ink-300">{money(i.paid_amount)}</td>
                                <td className="text-right tabular-nums">{money(i.forecast_amount)}</td>
                                <td className={`text-right tabular-nums ${Number(i.variance) > 0 ? 'text-ember-400' : 'text-forest-300'}`}>{money(i.variance)}</td>
                              </tr>
                            )))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Card className="!p-0 overflow-hidden h-fit">
                <div className="px-5 pt-4"><h3 className="text-sm font-semibold text-cream-50">Expense breakdown</h3></div>
                <div className="p-2">
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={budgetChart} layout="vertical" margin={{ left: 30, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#26282e" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#9aa0a9', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(v)} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#9aa0a9', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10 }} formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>{budgetChart.map((_, i) => <Cell key={i} fill={['#227d4f', '#d75f24', '#a02c4a', '#c99a2c', '#3a9a68', '#e87c3f'][i % 6]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : tab === 'revenue' ? (
        <div className="space-y-3">
          {canEditFinance && <div className="flex justify-end"><button className="btn-primary" onClick={() => { setFormError(null); setModal('rev'); }}><Plus className="h-4 w-4" /> Add revenue</button></div>}
          <DataTable rows={revenues} columns={revColumns} empty={<Card><EmptyState title="No revenue recorded" /></Card>} />
          <p className="text-2xs text-ink-500">Ledger revenue (cash): <span className="text-forest-300">{money(ledgerRevenue)}</span>. Ticket and player pricing is capped at {money(EVENT.maxTicketPrice)}.</p>
        </div>
      ) : tab === 'expenses' ? (
        <div className="space-y-3">
          {canEditFinance && <div className="flex justify-end"><button className="btn-primary" onClick={() => { setFormError(null); setModal('exp'); }}><Plus className="h-4 w-4" /> Add expense</button></div>}
          <DataTable rows={expenses} columns={expColumns} empty={<Card><EmptyState title="No expenses recorded" /></Card>} />
          <p className="text-2xs text-ink-500">Ledger expenses (cash): <span className="text-ember-300">{money(ledgerExpense)}</span>.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-4"><Scale className="h-4 w-4 text-gold-400" /><h3 className="text-sm font-semibold text-cream-50">Break-even calculator</h3></div>
            <label className="label">Ticket price (max {money(EVENT.maxTicketPrice)})</label>
            <input type="range" min={0} max={EVENT.maxTicketPrice} value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} className="w-full accent-ember-500" />
            <p className="text-sm text-cream-50 mb-3">{money(ticketPrice)}</p>
            <label className="label">Attendance (target {EVENT.capacityTarget})</label>
            <input type="range" min={0} max={EVENT.capacityTarget} value={attendance} onChange={(e) => setAttendance(Number(e.target.value))} className="w-full accent-forest-500" />
            <p className="text-sm text-cream-50">{attendance} attendees</p>
          </Card>
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-cream-50">Projection</h3>
            <div className="flex justify-between text-sm"><span className="text-ink-400">Fixed costs (planned)</span><span className="tabular-nums text-cream-50">{money(fixedCosts)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-400">Non-ticket revenue (forecast)</span><span className="tabular-nums text-forest-300">{money(nonTicketRevenue)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-400">Ticket revenue</span><span className="tabular-nums text-forest-300">{money(ticketRevenue)}</span></div>
            <div className="border-t border-ink-700 pt-3 flex justify-between"><span className="text-cream-50 font-medium">Projected net</span><span className={`tabular-nums font-semibold ${projectedNet >= 0 ? 'text-forest-300' : 'text-ember-400'}`}>{money(projectedNet)}</span></div>
            <div className="rounded-lg bg-ink-950/60 p-3">
              <p className="text-xs text-ink-400">Break-even ticket sales at {money(ticketPrice)}</p>
              <p className="font-display text-2xl text-cream-50">{breakEvenTickets} <span className="text-sm text-ink-400">tickets</span></p>
              <Progress value={attendance} max={Math.max(breakEvenTickets, attendance, 1)} tone={projectedNet >= 0 ? 'forest' : 'ember'} />
            </div>
          </Card>
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'rev' ? 'Add revenue' : modal === 'exp' ? 'Add expense' : 'Add budget line'} size="lg">
        {modal === 'rev' && <DynamicForm fields={REV_FIELDS} initial={{ status: 'expected' }} error={formError} submitting={insertRev.isPending} onCancel={() => setModal(null)} onSubmit={async (v) => { try { await insertRev.mutateAsync(v); setModal(null); } catch (e) { setFormError(e instanceof Error ? e.message : String(e)); } }} />}
        {modal === 'exp' && <DynamicForm fields={EXP_FIELDS} initial={{ approval_status: 'pending', payment_status: 'unpaid' }} error={formError} submitting={insertExp.isPending} onCancel={() => setModal(null)} onSubmit={async (v) => { try { await insertExp.mutateAsync(v); setModal(null); } catch (e) { setFormError(e instanceof Error ? e.message : String(e)); } }} />}
        {modal === 'item' && <DynamicForm fields={[
          { name: 'category_id', label: 'Category', type: 'select', required: true, options: scenarioCats.map((c) => ({ value: c.id, label: `${c.name} (${c.kind})` })) },
          { name: 'name', label: 'Line name', required: true, colSpan: 2 },
          { name: 'planned_amount', label: 'Planned', type: 'money', min: 0 },
          { name: 'forecast_amount', label: 'Forecast', type: 'money', min: 0 },
          { name: 'committed_amount', label: 'Committed', type: 'money', min: 0 },
          { name: 'paid_amount', label: 'Paid', type: 'money', min: 0 },
        ]} error={formError} submitting={insertItem.isPending} onCancel={() => setModal(null)} onSubmit={async (v) => { try { await insertItem.mutateAsync(v); setModal(null); } catch (e) { setFormError(e instanceof Error ? e.message : String(e)); } }} />}
      </Modal>
    </div>
  );
}
