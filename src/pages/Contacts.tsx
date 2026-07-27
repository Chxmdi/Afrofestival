import { SectionTitle } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const contacts: ResourceConfig<AnyRow> = {
  table: 'contacts', title: 'Contact Directory', addLabel: 'Contact', csvName: 'contacts',
  list: { order: { column: 'full_name' } },
  searchKeys: ['full_name', 'email', 'role_title'],
  columns: [
    { key: 'full_name', header: 'Name', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.full_name as string}</p><p className="text-2xs text-ink-400">{(r.role_title as string) ?? '—'}</p></div> },
    { key: 'email', header: 'Email', render: (r) => (r.email as string) ?? '—' },
    { key: 'phone', header: 'Phone', render: (r) => (r.phone as string) ?? '—' },
    { key: 'location', header: 'Location' },
  ],
  fields: [
    { name: 'full_name', label: 'Full Name', required: true, colSpan: 2 },
    { name: 'role_title', label: 'Role / Title' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'linkedin_url', label: 'LinkedIn', type: 'url' },
    { name: 'location', label: 'Location' },
    { name: 'source', label: 'Source' },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
};

const organizations: ResourceConfig<AnyRow> = {
  table: 'organizations', title: 'Organizations', addLabel: 'Organization', csvName: 'organizations',
  list: { order: { column: 'name' } },
  searchKeys: ['name', 'industry', 'domain'],
  columns: [
    { key: 'name', header: 'Organization', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.name as string}</p><p className="text-2xs text-ink-400">{(r.domain as string) ?? '—'}</p></div> },
    { key: 'industry', header: 'Industry', sortable: true },
    { key: 'location', header: 'Location' },
    { key: 'website', header: 'Website', render: (r) => r.website ? <a href={r.website as string} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300 text-xs">Open</a> : '—' },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, colSpan: 2 },
    { name: 'legal_name', label: 'Legal Name' },
    { name: 'domain', label: 'Domain' },
    { name: 'website', label: 'Website', type: 'url' },
    { name: 'industry', label: 'Industry' },
    { name: 'location', label: 'Location' },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  ],
};

export function Contacts() {
  return (
    <div>
      <SectionTitle title="Contacts & Organizations" subtitle="Master directory of every person and organisation" />
      <TabbedResources tabs={[
        { key: 'contacts', label: 'Contacts', config: contacts },
        { key: 'orgs', label: 'Organizations', config: organizations },
      ]} />
    </div>
  );
}
