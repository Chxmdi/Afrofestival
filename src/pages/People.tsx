import { SectionTitle, Badge } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import { formatDateTime, titleCase } from '@/lib/format';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const volunteers: ResourceConfig<AnyRow> = {
  table: 'volunteers', title: 'Volunteers', addLabel: 'Volunteer', csvName: 'volunteers',
  list: { order: { column: 'created_at', ascending: false } },
  searchKeys: ['full_name', 'email'],
  filters: [{ key: 'status', label: 'Status', options: ['applied', 'approved', 'confirmed', 'declined', 'inactive'].map((v) => ({ value: v, label: titleCase(v) })) }],
  columns: [
    { key: 'full_name', header: 'Name', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.full_name as string}</p><p className="text-2xs text-ink-400">{(r.email as string) ?? '—'}</p></div> },
    { key: 'training_status', header: 'Training', render: (r) => <Badge color={r.training_status === 'complete' ? '#227d4f' : r.training_status === 'in_progress' ? '#c99a2c' : '#6b7079'}>{titleCase(r.training_status as string)}</Badge> },
    { key: 'consent_given', header: 'Consent', align: 'center', render: (r) => r.consent_given ? <span className="text-forest-400">✓</span> : <span className="text-ember-400">—</span> },
    { key: 'checked_in', header: 'Checked in', align: 'center', render: (r) => r.checked_in ? <span className="text-forest-400">✓</span> : <span className="text-ink-500">—</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={['approved', 'confirmed'].includes(r.status as string) ? '#227d4f' : '#6b7079'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'full_name', label: 'Full Name', required: true, colSpan: 2 },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'skills', label: 'Skills', type: 'tags', help: 'Comma-separated' },
    { name: 'availability', label: 'Availability' },
    { name: 'emergency_contact_name', label: 'Emergency Contact' },
    { name: 'emergency_contact_phone', label: 'Emergency Phone', type: 'tel' },
    { name: 'training_status', label: 'Training', type: 'select', options: ['not_started', 'in_progress', 'complete'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'consent_given', label: 'Consent given', type: 'boolean' },
    { name: 'checked_in', label: 'Checked in', type: 'boolean' },
    { name: 'status', label: 'Status', type: 'select', options: ['applied', 'approved', 'confirmed', 'declined', 'inactive'].map((v) => ({ value: v, label: titleCase(v) })) },
  ],
};

const roles: ResourceConfig<AnyRow> = {
  table: 'volunteer_roles', title: 'Volunteer Roles', addLabel: 'Role', csvName: 'volunteer_roles',
  searchKeys: ['name'],
  columns: [
    { key: 'name', header: 'Role', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.name as string}</span> },
    { key: 'description', header: 'Description' },
    { key: 'headcount_needed', header: 'Headcount', align: 'right' },
  ],
  fields: [
    { name: 'name', label: 'Role Name', required: true, colSpan: 2 },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    { name: 'headcount_needed', label: 'Headcount Needed', type: 'number', min: 0 },
  ],
};

const shifts: ResourceConfig<AnyRow> = {
  table: 'shifts', title: 'Shifts', addLabel: 'Shift', csvName: 'shifts',
  list: { order: { column: 'starts_at' } },
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Shift', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'starts_at', header: 'Start', accessor: (r) => (r.starts_at as string) ?? '', render: (r) => formatDateTime(r.starts_at as string) },
    { key: 'ends_at', header: 'End', render: (r) => formatDateTime(r.ends_at as string) },
    { key: 'slots_needed', header: 'Slots', align: 'right' },
  ],
  fields: [
    { name: 'title', label: 'Shift Title', required: true, colSpan: 2 },
    { name: 'starts_at', label: 'Starts At', type: 'datetime-local', required: true },
    { name: 'ends_at', label: 'Ends At', type: 'datetime-local', required: true },
    { name: 'slots_needed', label: 'Slots Needed', type: 'number', min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
};

export function People() {
  return (
    <div>
      <SectionTitle title="People & Volunteers" subtitle="Volunteer directory, roles and shift scheduling" />
      <TabbedResources tabs={[
        { key: 'volunteers', label: 'Volunteers', config: volunteers },
        { key: 'roles', label: 'Roles', config: roles },
        { key: 'shifts', label: 'Shifts', config: shifts },
      ]} />
    </div>
  );
}
