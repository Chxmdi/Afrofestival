import { SectionTitle, Badge, Meter } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import { money, titleCase } from '@/lib/format';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const venues: ResourceConfig<AnyRow> = {
  table: 'venues', title: 'Venues', addLabel: 'Venue', csvName: 'venues',
  list: { order: { column: 'overall_score', ascending: false } },
  searchKeys: ['name', 'address'],
  filters: [{ key: 'status', label: 'Status', options: ['considering', 'shortlisted', 'quoted', 'selected', 'rejected'].map((v) => ({ value: v, label: titleCase(v) })) }],
  columns: [
    { key: 'name', header: 'Venue', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.name as string}</p><p className="text-2xs text-ink-400">{(r.address as string) ?? '—'}</p></div> },
    { key: 'capacity', header: 'Capacity', sortable: true, align: 'right' },
    { key: 'suitable_pitches', header: 'Pitches', align: 'center' },
    { key: 'indoor_outdoor', header: 'Type', render: (r) => <Badge color="#3a9a68">{titleCase(r.indoor_outdoor as string)}</Badge> },
    { key: 'cost', header: 'Cost', sortable: true, align: 'right', accessor: (r) => r.cost as number, render: (r) => money(r.cost as number) },
    { key: 'overall_score', header: 'Score', sortable: true, accessor: (r) => r.overall_score as number, render: (r) => <Meter score={r.overall_score as number} /> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'selected' ? '#227d4f' : r.status === 'shortlisted' ? '#c99a2c' : '#6b7079'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'name', label: 'Venue Name', required: true, colSpan: 2 },
    { name: 'address', label: 'Address', colSpan: 2 },
    { name: 'capacity', label: 'Capacity', type: 'number', min: 0 },
    { name: 'suitable_pitches', label: 'Suitable Pitches', type: 'number', min: 0 },
    { name: 'indoor_outdoor', label: 'Indoor / Outdoor', type: 'select', options: ['indoor', 'outdoor', 'both'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'availability', label: 'Availability' },
    { name: 'cost', label: 'Cost (CAD)', type: 'money', min: 0 },
    { name: 'deposit', label: 'Deposit (CAD)', type: 'money', min: 0 },
    { name: 'transit_access', label: 'Transit Access' },
    { name: 'parking', label: 'Parking' },
    { name: 'accessibility', label: 'Accessibility' },
    { name: 'alcohol_rules', label: 'Alcohol Rules' },
    { name: 'sound_restrictions', label: 'Sound Restrictions' },
    { name: 'curfew', label: 'Curfew' },
    { name: 'rain_plan', label: 'Rain Plan', colSpan: 2 },
    { name: 'overall_score', label: 'Overall Score (0-100)', type: 'number', min: 0, max: 100 },
    { name: 'status', label: 'Status', type: 'select', options: ['considering', 'shortlisted', 'quoted', 'selected', 'rejected'].map((v) => ({ value: v, label: titleCase(v) })) },
  ],
};

const zones: ResourceConfig<AnyRow> = {
  table: 'site_zones', title: 'Site Zones', addLabel: 'Zone', csvName: 'site_zones',
  list: { order: { column: 'sort_order' } },
  searchKeys: ['name', 'zone_type'],
  columns: [
    { key: 'name', header: 'Zone', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.name as string}</span> },
    { key: 'zone_type', header: 'Type', render: (r) => <Badge color="#d75f24">{titleCase(r.zone_type as string)}</Badge> },
    { key: 'description', header: 'Description' },
    { key: 'capacity', header: 'Capacity', align: 'right' },
  ],
  fields: [
    { name: 'name', label: 'Zone Name', required: true, colSpan: 2 },
    { name: 'zone_type', label: 'Type', type: 'select', options: ['pitch', 'stage', 'food', 'retail', 'activation', 'art', 'sponsor', 'community', 'safety', 'ops', 'access'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'description', label: 'Description', colSpan: 2 },
    { name: 'capacity', label: 'Capacity', type: 'number', min: 0 },
    { name: 'sort_order', label: 'Sort Order', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
};

export function Venues() {
  return (
    <div>
      <SectionTitle title="Venues & Site Operations" subtitle="Compare venues and lay out the festival footprint" />
      <TabbedResources tabs={[{ key: 'venues', label: 'Venue Comparison', config: venues }, { key: 'zones', label: 'Site Zones', config: zones }]} />
    </div>
  );
}
