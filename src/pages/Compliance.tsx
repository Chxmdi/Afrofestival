import { AlertTriangle } from 'lucide-react';
import { SectionTitle, Badge } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import { formatDate, money, titleCase } from '@/lib/format';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const permitColor: Record<string, string> = { approved: '#227d4f', submitted: '#c99a2c', in_progress: '#e0b64d', not_started: '#6b7079', rejected: '#a02c4a', expired: '#84213a' };

const compliance: ResourceConfig<AnyRow> = {
  table: 'compliance_requirements', title: 'Permits & Compliance', addLabel: 'Requirement', csvName: 'compliance',
  list: { order: { column: 'submission_deadline' } },
  searchKeys: ['requirement', 'authority'],
  filters: [{ key: 'status', label: 'Status', options: Object.keys(permitColor).map((v) => ({ value: v, label: titleCase(v) })) }],
  columns: [
    { key: 'requirement', header: 'Requirement', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.requirement as string}</p><p className="text-2xs text-ink-400">{r.authority as string ?? '—'}</p></div> },
    { key: 'submission_deadline', header: 'Deadline', sortable: true, accessor: (r) => (r.submission_deadline as string) ?? '', render: (r) => formatDate(r.submission_deadline as string) },
    { key: 'status', header: 'Status', render: (r) => <Badge color={permitColor[r.status as string]}>{titleCase(r.status as string)}</Badge> },
    { key: 'fee', header: 'Fee', align: 'right', render: (r) => money(r.fee as number) },
    { key: 'needs_verification', header: 'Verify', align: 'center', render: (r) => r.needs_verification ? <Badge color="#e0b64d">Needs verification</Badge> : <span className="text-forest-400">✓</span> },
  ],
  fields: [
    { name: 'requirement', label: 'Requirement', required: true, colSpan: 2 },
    { name: 'authority', label: 'Authority' },
    { name: 'submission_deadline', label: 'Submission Deadline', type: 'date' },
    { name: 'submission_date', label: 'Submitted Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: Object.keys(permitColor).map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'fee', label: 'Fee (CAD)', type: 'money', min: 0 },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { name: 'dependencies', label: 'Dependencies' },
    { name: 'needs_verification', label: 'Requires official verification', type: 'boolean' },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
};

const risks: ResourceConfig<AnyRow> = {
  table: 'risks', title: 'Risk Register', addLabel: 'Risk', csvName: 'risks',
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Risk', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'likelihood', header: 'Likelihood', align: 'center' },
    { key: 'impact', header: 'Impact', align: 'center' },
    { key: 'severity', header: 'Severity', sortable: true, accessor: (r) => r.severity as number, align: 'center', render: (r) => <Badge color={(r.severity as number) >= 15 ? '#a02c4a' : (r.severity as number) >= 8 ? '#e0b64d' : '#6b7079'}>{r.severity as number}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'closed' ? '#227d4f' : '#c99a2c'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'title', label: 'Risk', required: true, colSpan: 2 },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    { name: 'likelihood', label: 'Likelihood (1-5)', type: 'number', min: 1, max: 5 },
    { name: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5 },
    { name: 'mitigation', label: 'Mitigation', type: 'textarea', colSpan: 2 },
    { name: 'status', label: 'Status', type: 'select', options: ['open', 'mitigating', 'closed'].map((v) => ({ value: v, label: titleCase(v) })) },
  ],
};

const decisions: ResourceConfig<AnyRow> = {
  table: 'decisions', title: 'Decision Log', addLabel: 'Decision', csvName: 'decisions',
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Decision', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'decided_at', header: 'Decided', accessor: (r) => (r.decided_at as string) ?? '', render: (r) => formatDate(r.decided_at as string) },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'decided' ? '#227d4f' : '#c99a2c'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'title', label: 'Decision', required: true, colSpan: 2 },
    { name: 'context', label: 'Context', type: 'textarea', colSpan: 2 },
    { name: 'decision', label: 'Decision', type: 'textarea', colSpan: 2 },
    { name: 'decided_at', label: 'Decided Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['proposed', 'decided', 'revisited'].map((v) => ({ value: v, label: titleCase(v) })) },
  ],
};

const issues: ResourceConfig<AnyRow> = {
  table: 'issues', title: 'Issues', addLabel: 'Issue', csvName: 'issues',
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Issue', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'priority', header: 'Priority', render: (r) => <Badge color={r.priority === 'critical' ? '#a02c4a' : r.priority === 'high' ? '#e87c3f' : '#6b7079'}>{titleCase(r.priority as string)}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={['resolved', 'closed'].includes(r.status as string) ? '#227d4f' : '#c99a2c'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'title', label: 'Issue', required: true, colSpan: 2 },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'resolved', 'closed'].map((v) => ({ value: v, label: titleCase(v) })) },
  ],
};

export function Compliance() {
  return (
    <div>
      <SectionTitle title="Compliance, Risk & Governance" subtitle="Permits, risk register, decisions and issues" />
      <TabbedResources
        banner={
          <div className="flex items-start gap-2 rounded-lg border border-gold-600/40 bg-gold-600/10 p-3 text-xs text-gold-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Seeded compliance items are planning placeholders and must be confirmed with the relevant authorities. All are flagged <strong>needs verification</strong> until officially checked.</span>
          </div>
        }
        tabs={[
          { key: 'permits', label: 'Permits & Compliance', config: compliance },
          { key: 'risks', label: 'Risks', config: risks },
          { key: 'decisions', label: 'Decisions', config: decisions },
          { key: 'issues', label: 'Issues', config: issues },
        ]}
      />
    </div>
  );
}
