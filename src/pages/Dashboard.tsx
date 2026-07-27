import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Handshake, Store, Trophy, Wallet, ShieldCheck, Users, AlertTriangle, ArrowRight,
  CalendarClock, Receipt, FileText, ListChecks, TrendingUp, Ticket,
} from 'lucide-react';
import { useDashboard } from '@/lib/dashboard';
import { useRows } from '@/lib/hooks';
import { EVENT, SPONSOR_STAGES, TASK_STATUSES } from '@/lib/constants';
import { money, compactMoney, formatDateTime, titleCase } from '@/lib/format';
import { Card, StatCard, Progress, Spinner, ErrorState, EmptyState } from '@/components/ui';

function Ring({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const tone = value >= 70 ? '#227d4f' : value >= 45 ? '#c99a2c' : '#d75f24';
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#26282e" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-2xl text-cream-50 leading-none">{value}</p>
          <p className="text-2xs text-ink-400 mt-0.5">Readiness</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="text-sm font-semibold text-cream-50">{title}</h3>
        {hint && <span className="text-2xs text-ink-500">{hint}</span>}
      </div>
      <div className="px-2 pb-2 pt-3">{children}</div>
    </Card>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: d, isLoading, error, refetch } = useDashboard();
  const { data: activity = [] } = useRows<{ id: string; action: string; summary: string | null; entity_type: string | null; created_at: string }>(
    'activity_logs', { order: { column: 'created_at', ascending: false }, limit: 8 },
  );

  if (isLoading) return <Card><Spinner label="Assembling your control room…" /></Card>;
  if (error || !d) return <Card><ErrorState error={error ?? 'No data'} retry={refetch} /></Card>;

  // Needs Attention — ranked by urgency
  const attention: { label: string; detail: string; tone: 'critical' | 'warning' | 'info'; to: string }[] = [];
  if (d.tasks.overdue > 0) attention.push({ label: `${d.tasks.overdue} overdue task${d.tasks.overdue > 1 ? 's' : ''}`, detail: 'Past due date and not complete', tone: 'critical', to: '/planning' });
  if (d.tasks.blocked > 0) attention.push({ label: `${d.tasks.blocked} blocked task${d.tasks.blocked > 1 ? 's' : ''}`, detail: 'Waiting on a blocker', tone: 'warning', to: '/planning' });
  if (d.vendors.missingDocs > 0) attention.push({ label: `${d.vendors.missingDocs} vendors missing documents`, detail: 'Insurance / MAPAQ outstanding', tone: 'warning', to: '/vendors' });
  if (d.tournament.outstandingWaivers > 0) attention.push({ label: `${d.tournament.outstandingWaivers} player waivers outstanding`, detail: 'Required before eligibility', tone: 'warning', to: '/tournament' });
  if (d.sponsors.outstandingInvoices > 0) attention.push({ label: `${money(d.sponsors.outstandingInvoices)} sponsor invoices unpaid`, detail: 'Follow up with finance', tone: 'warning', to: '/finance' });
  if (d.volunteers.uncoveredShifts > 0) attention.push({ label: `${d.volunteers.uncoveredShifts} uncovered shifts`, detail: 'Assign volunteers', tone: 'warning', to: '/people' });
  if (d.milestones.atRisk > 0) attention.push({ label: `${d.milestones.atRisk} milestones at risk`, detail: 'Review timeline', tone: 'critical', to: '/planning' });
  if ((d.permits.byStatus['not_started'] ?? 0) > 0) attention.push({ label: `${d.permits.byStatus['not_started']} permits not started`, detail: 'Requires official verification', tone: 'info', to: '/compliance' });
  if (d.sponsors.securedCash < d.sponsors.cashGoal) attention.push({ label: `${money(d.sponsors.cashGoal - d.sponsors.securedCash)} to sponsorship goal`, detail: `${money(d.sponsors.securedCash)} of ${money(d.sponsors.cashGoal)} secured`, tone: 'info', to: '/sponsors' });
  const toneOrder = { critical: 0, warning: 1, info: 2 };
  attention.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);

  const budgetChart = [
    { name: 'Planned', value: d.budget.planned },
    { name: 'Committed', value: d.budget.committed },
    { name: 'Paid', value: d.budget.paid },
    { name: 'Forecast', value: d.budget.forecast },
  ];
  const funnelData = SPONSOR_STAGES
    .filter((s) => !['won', 'lost', 'on_hold'].includes(s.value))
    .map((s) => ({ name: s.label, value: d.sponsors.byStage[s.value] ?? 0, color: s.color }))
    .filter((s) => s.value > 0);
  const taskData = TASK_STATUSES.map((s) => ({ name: s.label, value: d.tasks.byStatus[s.value] ?? 0, color: s.color })).filter((t) => t.value > 0);
  const secured = d.sponsors.securedCash;

  const quickActions = [
    { label: 'Add sponsor', icon: Handshake, to: '/sponsors' },
    { label: 'Review vendors', icon: Store, to: '/vendors' },
    { label: 'Register team', icon: Trophy, to: '/tournament' },
    { label: 'Log expense', icon: Receipt, to: '/finance' },
    { label: 'New task', icon: ListChecks, to: '/planning' },
    { label: 'Documents', icon: FileText, to: '/documents' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card relative overflow-hidden p-6 texture-diag">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ember-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Ring value={d.readiness} />
            <div>
              <p className="text-2xs uppercase tracking-wider text-gold-400">Executive Dashboard</p>
              <h1 className="font-display text-2xl sm:text-3xl text-cream-50 mt-1">{EVENT.name}</h1>
              <p className="text-sm text-ink-300 mt-1">{EVENT.city} · {EVENT.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-display text-4xl text-cream-50">{d.daysUntil}</p>
              <p className="text-2xs text-ink-400 mt-1">days to {EVENT.provisionalDate}</p>
            </div>
            <div className="h-12 w-px bg-ink-700 hidden sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm text-ink-300">Backup date</p>
              <p className="font-display text-lg text-cream-50">{EVENT.backupDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.to)} className="btn-secondary">
            <a.icon className="h-4 w-4 text-gold-400" /> {a.label}
          </button>
        ))}
      </div>

      {/* Primary KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard label="Planned Budget" value={compactMoney(d.budget.planned)} sub={`Working budget ${compactMoney(EVENT.workingBudget)}`} accent="gold" icon={<Wallet className="h-4 w-4" />} onClick={() => navigate('/finance')} />
        <StatCard label="Committed" value={compactMoney(d.budget.committed)} sub="Contracted spend" accent="ember" onClick={() => navigate('/finance')} />
        <StatCard label="Paid" value={compactMoney(d.budget.paid)} sub="Cash out the door" accent="wine" onClick={() => navigate('/finance')} />
        <StatCard label="Remaining Budget" value={compactMoney(d.budget.remaining)} sub={<span className={d.budget.variance > 0 ? 'text-ember-400' : 'text-forest-300'}>Forecast variance {d.budget.variance >= 0 ? '+' : ''}{compactMoney(d.budget.variance)}</span>} accent="forest" onClick={() => navigate('/finance')} />

        <StatCard label="Sponsorship Cash" value={compactMoney(secured)} sub={<Progress value={secured} max={d.sponsors.cashGoal} tone="forest" />} accent="forest" icon={<Handshake className="h-4 w-4" />} onClick={() => navigate('/sponsors')} />
        <StatCard label="In-kind Secured" value={compactMoney(d.sponsors.securedInkind)} sub={`Goal ${compactMoney(d.sponsors.inkindGoal)}`} accent="gold" onClick={() => navigate('/sponsors')} />
        <StatCard label="Weighted Pipeline" value={compactMoney(d.sponsors.weightedPipeline)} sub="Probability-adjusted" accent="ember" icon={<TrendingUp className="h-4 w-4" />} onClick={() => navigate('/sponsors')} />
        <StatCard label="Sponsor Invoices Due" value={money(d.sponsors.outstandingInvoices)} sub="Outstanding" accent="wine" onClick={() => navigate('/finance')} />

        <StatCard label="Teams Registered" value={`${d.tournament.teams} / ${d.tournament.teamsMax}`} sub={<Progress value={d.tournament.teams} max={d.tournament.teamsMax} tone="ember" />} accent="ember" icon={<Trophy className="h-4 w-4" />} onClick={() => navigate('/tournament')} />
        <StatCard label="Registered Players" value={d.tournament.players} sub={`${d.tournament.outstandingWaivers} waivers outstanding`} accent="gold" onClick={() => navigate('/tournament')} />
        <StatCard label="Fixtures Scheduled" value={d.tournament.fixtures} sub="Group + knockout" accent="forest" onClick={() => navigate('/tournament')} />
        <StatCard label="Vendor Applications" value={d.vendors.applications} sub={`${d.vendors.approved} approved · ${d.vendors.missingDocs} missing docs`} accent="wine" icon={<Store className="h-4 w-4" />} onClick={() => navigate('/vendors')} />

        <StatCard label="Tasks Due This Week" value={d.tasks.dueThisWeek} sub={`${d.tasks.overdue} overdue · ${d.tasks.blocked} blocked`} accent="ember" icon={<CalendarClock className="h-4 w-4" />} onClick={() => navigate('/planning')} />
        <StatCard label="Volunteers" value={`${d.volunteers.assigned}/${d.volunteers.recruited}`} sub={`${d.volunteers.uncoveredShifts} uncovered shifts`} accent="forest" icon={<Users className="h-4 w-4" />} onClick={() => navigate('/people')} />
        <StatCard label="Permits" value={`${(d.permits.byStatus['approved'] ?? 0)}/${d.permits.total}`} sub="Approved · needs verification" accent="wine" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => navigate('/compliance')} />
        <StatCard label="Attendance Forecast" value={`${d.attendance.forecast}`} sub={<Progress value={d.attendance.forecast} max={d.attendance.target} tone="gold" />} accent="gold" icon={<Ticket className="h-4 w-4" />} onClick={() => navigate('/finance')} />
      </div>

      {/* Needs attention + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 !p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-ember-400" />
            <h3 className="text-sm font-semibold text-cream-50">Needs Attention</h3>
          </div>
          <div className="divide-y divide-ink-800/70 max-h-[420px] overflow-y-auto">
            {attention.length === 0 ? (
              <EmptyState title="All clear" message="No urgent items right now." />
            ) : attention.map((a, i) => (
              <button key={i} onClick={() => navigate(a.to)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-ink-800/40">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.tone === 'critical' ? '#a02c4a' : a.tone === 'warning' ? '#e0b64d' : '#6b7079' }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-cream-50">{a.label}</span>
                  <span className="block text-xs text-ink-400">{a.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-ink-500 mt-1" />
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChartCard title="Budget flow" hint="CAD">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetChart} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26282e" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9aa0a9', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9aa0a9', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(v)} />
                <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10, color: '#f6f0e4' }} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {budgetChart.map((_, i) => <Cell key={i} fill={['#c99a2c', '#d75f24', '#a02c4a', '#227d4f'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Task status">
            {taskData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                    {taskData.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10, color: '#f6f0e4' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No tasks" />}
          </ChartCard>

          <ChartCard title="Sponsor funnel">
            {funnelData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fill: '#9aa0a9', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10, color: '#f6f0e4' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No prospects yet" />}
          </ChartCard>

          <ChartCard title="Team registration">
            <div className="flex h-[200px] flex-col justify-center px-4">
              <div className="flex items-end justify-between">
                <p className="font-display text-4xl text-cream-50">{d.tournament.teams}<span className="text-lg text-ink-400">/{d.tournament.teamsMax}</span></p>
                <p className="text-sm text-ink-400">{d.tournament.regProgress}%</p>
              </div>
              <div className="mt-3"><Progress value={d.tournament.teams} max={d.tournament.teamsMax} tone="ember" /></div>
              <div className="mt-4 grid grid-cols-4 gap-1">
                {Array.from({ length: EVENT.teams }).map((_, i) => (
                  <div key={i} className={`h-6 rounded ${i < d.tournament.teams ? 'bg-ember-500/80' : 'bg-ink-700'}`} />
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-400">{EVENT.groups} groups of 4 · {d.tournament.players} players registered</p>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Recent activity */}
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-ink-700 px-5 py-4"><h3 className="text-sm font-semibold text-cream-50">Recent activity</h3></div>
        {activity.length === 0 ? <EmptyState title="No activity yet" /> : (
          <ul className="divide-y divide-ink-800/70">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2 w-2 rounded-full bg-gold-500" />
                <span className="flex-1 text-sm text-ink-200">{a.summary ?? titleCase(a.action)}</span>
                <span className="text-2xs text-ink-500">{a.entity_type ? titleCase(a.entity_type) : ''} · {formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
