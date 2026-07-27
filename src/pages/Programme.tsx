import { SectionTitle, Badge } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import { money, formatDateTime, titleCase } from '@/lib/format';
import { PERFORMER_DISCIPLINES } from '@/lib/constants';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const performers: ResourceConfig<AnyRow> = {
  table: 'performers', title: 'Performers & Creators', addLabel: 'Performer', csvName: 'performers',
  list: { order: { column: 'created_at', ascending: false } },
  searchKeys: ['name', 'discipline'],
  filters: [{ key: 'status', label: 'Status', options: ['prospect', 'invited', 'confirmed', 'declined', 'cancelled'].map((v) => ({ value: v, label: titleCase(v) })) }],
  columns: [
    { key: 'name', header: 'Performer', sortable: true, render: (r) => <div className="flex items-center gap-2"><p className="font-medium text-cream-50">{r.name as string}</p>{Boolean(r.black_owned) && <Badge color="#c99a2c">Black-owned</Badge>}</div> },
    { key: 'discipline', header: 'Discipline', render: (r) => <Badge color="#d75f24">{titleCase(r.discipline as string)}</Badge> },
    { key: 'fee', header: 'Fee', sortable: true, accessor: (r) => r.fee as number, align: 'right', render: (r) => money(r.fee as number) },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'confirmed' ? '#227d4f' : r.status === 'invited' ? '#c99a2c' : '#6b7079'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, colSpan: 2 },
    { name: 'discipline', label: 'Discipline', type: 'select', required: true, options: PERFORMER_DISCIPLINES.map((d) => ({ value: d.value, label: d.label })) },
    { name: 'contact_name', label: 'Contact Name' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'black_owned', label: 'Black-owned', type: 'boolean' },
    { name: 'fee', label: 'Fee (CAD)', type: 'money', min: 0 },
    { name: 'status', label: 'Status', type: 'select', options: ['prospect', 'invited', 'confirmed', 'declined', 'cancelled'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'bio', label: 'Bio', type: 'textarea', colSpan: 2 },
  ],
};

const runOfShow: ResourceConfig<AnyRow> = {
  table: 'program_items', title: 'Run of Show', addLabel: 'Programme Item', csvName: 'run_of_show',
  list: { order: { column: 'start_time' } },
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Item', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'item_type', header: 'Type', render: (r) => <Badge color="#3a9a68">{titleCase(r.item_type as string)}</Badge> },
    { key: 'start_time', header: 'Start', accessor: (r) => (r.start_time as string) ?? '', render: (r) => formatDateTime(r.start_time as string) },
    { key: 'end_time', header: 'End', render: (r) => formatDateTime(r.end_time as string) },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, colSpan: 2 },
    { name: 'item_type', label: 'Type', type: 'select', options: ['performance', 'ceremony', 'match', 'activation', 'break', 'other'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'start_time', label: 'Start Time', type: 'datetime-local' },
    { name: 'end_time', label: 'End Time', type: 'datetime-local' },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
};

export function Programme() {
  return (
    <div>
      <SectionTitle title="Cultural Programme" subtitle="Performers, creators and the festival run of show" />
      <TabbedResources tabs={[
        { key: 'performers', label: 'Performers', config: performers },
        { key: 'ros', label: 'Run of Show', config: runOfShow },
      ]} />
    </div>
  );
}
