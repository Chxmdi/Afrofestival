import { useState } from 'react';
import { Printer, Download, FileBarChart, ArrowLeft } from 'lucide-react';
import { useRows } from '@/lib/hooks';
import { useDashboard } from '@/lib/dashboard';
import { EVENT } from '@/lib/constants';
import { money, compactMoney, formatDate, formatDateTime, titleCase, downloadCSV, percent } from '@/lib/format';
import { Card, SectionTitle, Spinner, EmptyState } from '@/components/ui';

interface ReportDef { key: string; title: string; desc: string }
const REPORTS: ReportDef[] = [
  { key: 'exec', title: 'Weekly Executive Update', desc: 'Readiness, budget, sponsorship and risks at a glance' },
  { key: 'pipeline', title: 'Sponsor Pipeline', desc: 'Every prospect by stage with weighted value' },
  { key: 'fulfilment', title: 'Sponsor Fulfilment', desc: 'Committed partners and deliverable status' },
  { key: 'vendors', title: 'Vendor Readiness', desc: 'Approvals, documents and logistics' },
  { key: 'budget', title: 'Budget & Variance', desc: 'Planned vs forecast across categories' },
  { key: 'teams', title: 'Tournament Registrations', desc: 'Teams, rosters and payments' },
  { key: 'permits', title: 'Permit & Compliance Readiness', desc: 'Requirements, deadlines and status' },
  { key: 'volunteers', title: 'Volunteer Coverage', desc: 'Shifts, assignments and gaps' },
  { key: 'runsheet', title: 'Event-Day Run Sheet', desc: 'Programme and fixtures schedule' },
  { key: 'impact', title: 'Post-Event Sponsor Impact', desc: 'Delivered value per partner' },
];

function ReportShell({ title, onBack, rows, csvName, children }: { title: string; onBack: () => void; rows?: Record<string, unknown>[]; csvName: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <button className="btn-ghost !px-2" onClick={onBack}><ArrowLeft className="h-5 w-5" /> Reports</button>
        <div className="flex gap-2">
          {rows && rows.length > 0 && <button className="btn-secondary" onClick={() => downloadCSV(csvName, rows)}><Download className="h-4 w-4" /> CSV</button>}
          <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
        </div>
      </div>
      <div className="print-area card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-ink-700 pb-3">
          <div>
            <h1 className="font-display text-xl text-cream-50">{title}</h1>
            <p className="text-xs text-ink-400">{EVENT.name} · {EVENT.city}</p>
          </div>
          <p className="text-2xs text-ink-500">Generated {formatDate(new Date().toISOString())}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <EmptyState title="No data for this report" />;
  return (
    <div className="table-wrap"><table className="data-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
  );
}

export function Reports() {
  const [active, setActive] = useState<string | null>(null);
  const { data: dash } = useDashboard();
  const { data: sponsors = [] } = useRows<Record<string, unknown>>('sponsor_prospects', { order: { column: 'weighted_value', ascending: false } });
  const { data: vendors = [] } = useRows<Record<string, unknown>>('vendors');
  const { data: budgetItems = [] } = useRows<Record<string, unknown>>('budget_items');
  const { data: budgetCats = [] } = useRows<Record<string, unknown>>('budget_categories');
  const { data: teams = [] } = useRows<Record<string, unknown>>('teams', { order: { column: 'name' } });
  const { data: permits = [] } = useRows<Record<string, unknown>>('compliance_requirements');
  const { data: shifts = [] } = useRows<Record<string, unknown>>('shifts', { order: { column: 'starts_at' } });
  const { data: assigns = [] } = useRows<Record<string, unknown>>('shift_assignments');
  const { data: program = [] } = useRows<Record<string, unknown>>('program_items', { order: { column: 'start_time' } });
  const { data: commitments = [] } = useRows<Record<string, unknown>>('sponsor_commitments');

  if (active === null) {
    return (
      <div>
        <SectionTitle title="Reports" subtitle="Printable and exportable operational reports" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setActive(r.key)} className="card p-4 text-left hover:border-ink-500 transition-colors">
              <FileBarChart className="h-5 w-5 text-gold-400 mb-2" />
              <p className="font-medium text-cream-50">{r.title}</p>
              <p className="text-xs text-ink-400 mt-1">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const def = REPORTS.find((r) => r.key === active)!;
  const back = () => setActive(null);

  if (active === 'exec') {
    if (!dash) return <Card><Spinner /></Card>;
    return (
      <ReportShell title={def.title} onBack={back} csvName="exec-update">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Days to event', dash.daysUntil], ['Readiness', `${dash.readiness}%`], ['Planned budget', compactMoney(dash.budget.planned)], ['Paid', compactMoney(dash.budget.paid)],
            ['Sponsorship secured', compactMoney(dash.sponsors.securedCash)], ['Weighted pipeline', compactMoney(dash.sponsors.weightedPipeline)], ['Teams', `${dash.tournament.teams}/${dash.tournament.teamsMax}`], ['Volunteers', dash.volunteers.recruited]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border border-ink-700 p-3"><p className="text-2xs text-ink-400">{l}</p><p className="font-display text-lg text-cream-50">{v}</p></div>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-cream-50 pt-2">Attention items</h3>
        <Table headers={['Area', 'Count']} rows={[
          ['Overdue tasks', dash.tasks.overdue], ['Blocked tasks', dash.tasks.blocked], ['Vendors missing docs', dash.vendors.missingDocs],
          ['Outstanding waivers', dash.tournament.outstandingWaivers], ['Uncovered shifts', dash.volunteers.uncoveredShifts], ['Milestones at risk', dash.milestones.atRisk],
        ]} />
      </ReportShell>
    );
  }

  if (active === 'pipeline') {
    const rows = sponsors.map((s) => [s.name as string, titleCase(s.stage as string), s.match_score as number ?? 0, money(s.suggested_ask as number), percent(s.probability as number), money(s.weighted_value as number)]);
    return <ReportShell title={def.title} onBack={back} csvName="sponsor-pipeline" rows={sponsors}><Table headers={['Organization', 'Stage', 'Match', 'Ask', 'Probability', 'Weighted']} rows={rows} /></ReportShell>;
  }
  if (active === 'fulfilment') {
    const rows = commitments.map((c) => [titleCase(c.commitment_type as string), money(c.cash_amount as number), money(c.inkind_value as number), titleCase(c.status as string), formatDate(c.agreed_at as string)]);
    return <ReportShell title={def.title} onBack={back} csvName="sponsor-fulfilment" rows={commitments}><Table headers={['Type', 'Cash', 'In-kind', 'Status', 'Agreed']} rows={rows} /></ReportShell>;
  }
  if (active === 'vendors') {
    const rows = vendors.map((v) => [(v.trading_name as string) || (v.legal_name as string), titleCase(v.status as string), money(v.vendor_fee as number), titleCase(v.invoice_status as string), v.logistics_ready ? 'Ready' : 'Pending']);
    return <ReportShell title={def.title} onBack={back} csvName="vendor-readiness" rows={vendors}><Table headers={['Vendor', 'Status', 'Fee', 'Payment', 'Logistics']} rows={rows} /></ReportShell>;
  }
  if (active === 'budget') {
    const catMap = Object.fromEntries(budgetCats.map((c) => [c.id, c]));
    const rows = budgetItems.map((i) => [(catMap[i.category_id as string]?.name as string) ?? '—', i.name as string, money(i.planned_amount as number), money(i.forecast_amount as number), money(i.paid_amount as number), money(i.variance as number)]);
    return <ReportShell title={def.title} onBack={back} csvName="budget-variance" rows={budgetItems}><Table headers={['Category', 'Line', 'Planned', 'Forecast', 'Paid', 'Variance']} rows={rows} /></ReportShell>;
  }
  if (active === 'teams') {
    const rows = teams.map((t) => [t.name as string, (t.represents as string) ?? '—', titleCase(t.registration_status as string), money(t.amount_paid as number) + ' / ' + money(t.registration_fee as number), t.eligibility_ok ? 'Yes' : 'No']);
    return <ReportShell title={def.title} onBack={back} csvName="tournament-registrations" rows={teams}><Table headers={['Team', 'Represents', 'Registration', 'Paid', 'Eligible']} rows={rows} /></ReportShell>;
  }
  if (active === 'permits') {
    const rows = permits.map((p) => [p.requirement as string, (p.authority as string) ?? '—', formatDate(p.submission_deadline as string), titleCase(p.status as string), p.needs_verification ? 'Needs verification' : 'Verified']);
    return <ReportShell title={def.title} onBack={back} csvName="permit-readiness" rows={permits}><Table headers={['Requirement', 'Authority', 'Deadline', 'Status', 'Verification']} rows={rows} /></ReportShell>;
  }
  if (active === 'volunteers') {
    const filled: Record<string, number> = {};
    assigns.forEach((a) => { const k = a.shift_id as string; filled[k] = (filled[k] ?? 0) + 1; });
    const rows = shifts.map((s) => [s.title as string, formatDateTime(s.starts_at as string), `${filled[s.id as string] ?? 0}/${s.slots_needed as number}`, (filled[s.id as string] ?? 0) >= (s.slots_needed as number) ? 'Covered' : 'Gap']);
    return <ReportShell title={def.title} onBack={back} csvName="volunteer-coverage" rows={shifts}><Table headers={['Shift', 'Start', 'Filled', 'Coverage']} rows={rows} /></ReportShell>;
  }
  if (active === 'runsheet') {
    const rows = program.map((p) => [formatDateTime(p.start_time as string), p.title as string, titleCase((p.item_type as string) ?? '—')]);
    return <ReportShell title={def.title} onBack={back} csvName="run-sheet" rows={program}><Table headers={['Time', 'Item', 'Type']} rows={rows} /></ReportShell>;
  }
  // impact
  const rows = commitments.map((c) => [titleCase(c.commitment_type as string), money(Number(c.cash_amount) + Number(c.inkind_value)), titleCase(c.status as string)]);
  return <ReportShell title={def.title} onBack={back} csvName="sponsor-impact" rows={commitments}><Table headers={['Partner type', 'Total value', 'Status']} rows={rows} /></ReportShell>;
}
