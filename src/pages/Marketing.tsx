import { SectionTitle, Badge } from '@/components/ui';
import { TabbedResources } from '@/components/TabbedResources';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import type { ResourceConfig, AnyRow } from '@/components/ResourceManager';

const CAMPAIGN_KINDS = ['brand_launch', 'team_announcements', 'culture_features', 'sponsor_announcements', 'vendor_announcements', 'performer_announcements', 'countdown', 'event_day', 'post_event_recap'];

const campaigns: ResourceConfig<AnyRow> = {
  table: 'campaigns', title: 'Campaigns', addLabel: 'Campaign', csvName: 'campaigns',
  list: { order: { column: 'start_date' } },
  searchKeys: ['name'],
  columns: [
    { key: 'name', header: 'Campaign', sortable: true, render: (r) => <div><p className="font-medium text-cream-50">{r.name as string}</p><p className="text-2xs text-ink-400">{titleCase(r.kind as string)}</p></div> },
    { key: 'start_date', header: 'Window', accessor: (r) => (r.start_date as string) ?? '', render: (r) => <span className="text-xs">{formatDate(r.start_date as string)} → {formatDate(r.end_date as string)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'active' ? '#227d4f' : r.status === 'complete' ? '#3a9a68' : '#6b7079'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, colSpan: 2 },
    { name: 'kind', label: 'Type', type: 'select', options: CAMPAIGN_KINDS.map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'paused', 'complete'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'goal', label: 'Goal', colSpan: 2 },
    { name: 'budget', label: 'Budget (CAD)', type: 'money', min: 0 },
  ],
};

const content: ResourceConfig<AnyRow> = {
  table: 'content_items', title: 'Content Calendar', addLabel: 'Content', csvName: 'content',
  list: { order: { column: 'scheduled_at' } },
  searchKeys: ['title'],
  filters: [{ key: 'status', label: 'Status', options: ['idea', 'drafting', 'review', 'approved', 'scheduled', 'published'].map((v) => ({ value: v, label: titleCase(v) })) }],
  columns: [
    { key: 'title', header: 'Content', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'channel', header: 'Channel' },
    { key: 'scheduled_at', header: 'Scheduled', accessor: (r) => (r.scheduled_at as string) ?? '', render: (r) => formatDateTime(r.scheduled_at as string) },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'published' ? '#227d4f' : r.status === 'approved' ? '#3a9a68' : r.status === 'review' ? '#c99a2c' : '#6b7079'}>{titleCase(r.status as string)}</Badge> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, colSpan: 2 },
    { name: 'channel', label: 'Channel', placeholder: 'Instagram, TikTok…' },
    { name: 'content_type', label: 'Type', placeholder: 'graphic, reel, article' },
    { name: 'status', label: 'Status', type: 'select', options: ['idea', 'drafting', 'review', 'approved', 'scheduled', 'published'].map((v) => ({ value: v, label: titleCase(v) })) },
    { name: 'scheduled_at', label: 'Scheduled At', type: 'datetime-local' },
    { name: 'body', label: 'Copy', type: 'textarea', colSpan: 2 },
  ],
};

const media: ResourceConfig<AnyRow> = {
  table: 'media_assets', title: 'Media Library', addLabel: 'Asset', csvName: 'media',
  list: { order: { column: 'created_at', ascending: false } },
  searchKeys: ['title'],
  columns: [
    { key: 'title', header: 'Asset', sortable: true, render: (r) => <span className="font-medium text-cream-50">{r.title as string}</span> },
    { key: 'asset_type', header: 'Type', render: (r) => <Badge color="#d75f24">{titleCase((r.asset_type as string) ?? 'file')}</Badge> },
    { key: 'file_url', header: 'Link', render: (r) => r.file_url ? <a href={r.file_url as string} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300 text-xs">Open</a> : '—' },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, colSpan: 2 },
    { name: 'asset_type', label: 'Type', placeholder: 'logo, photo, video' },
    { name: 'file_url', label: 'File URL', type: 'url', colSpan: 2 },
    { name: 'tags', label: 'Tags', type: 'tags' },
  ],
};

export function Marketing() {
  return (
    <div>
      <SectionTitle title="Marketing" subtitle="Campaign tracker, content calendar and media library" />
      <TabbedResources tabs={[
        { key: 'campaigns', label: 'Campaigns', config: campaigns },
        { key: 'content', label: 'Content Calendar', config: content },
        { key: 'media', label: 'Media Library', config: media },
      ]} />
    </div>
  );
}
