import { FolderOpen } from 'lucide-react';
import { SectionTitle, Badge, Card } from '@/components/ui';
import { ResourceManager, type ResourceConfig, type AnyRow } from '@/components/ResourceManager';
import { formatDate, titleCase } from '@/lib/format';

const BUCKETS = ['documents', 'receipts', 'vendor-files', 'sponsor-proposals', 'team-crests', 'player-waivers', 'media-assets'];

const config: ResourceConfig<AnyRow> = {
  table: 'documents', title: 'Documents', addLabel: 'Document', csvName: 'documents',
  list: { order: { column: 'created_at', ascending: false } },
  searchKeys: ['title', 'doc_type'],
  filters: [{ key: 'bucket', label: 'Bucket', options: BUCKETS.map((v) => ({ value: v, label: v })) }],
  columns: [
    { key: 'title', header: 'Document', sortable: true, render: (r) => <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-ink-500" /><span className="font-medium text-cream-50">{r.title as string}</span></div> },
    { key: 'doc_type', header: 'Type', render: (r) => (r.doc_type as string) ?? '—' },
    { key: 'bucket', header: 'Bucket', render: (r) => <Badge color="#3a9a68">{r.bucket as string}</Badge> },
    { key: 'created_at', header: 'Added', sortable: true, accessor: (r) => r.created_at as string, render: (r) => formatDate(r.created_at as string) },
    { key: 'file_url', header: 'Link', render: (r) => r.file_url ? <a href={r.file_url as string} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300 text-xs">Open</a> : '—' },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, colSpan: 2 },
    { name: 'doc_type', label: 'Type' },
    { name: 'bucket', label: 'Storage Bucket', type: 'select', options: BUCKETS.map((v) => ({ value: v, label: v })) },
    { name: 'file_url', label: 'File URL', type: 'url', colSpan: 2, help: 'Signed URL or link to the stored object.' },
  ],
};

export function Documents() {
  return (
    <div className="space-y-4">
      <SectionTitle title="Documents" subtitle="Central register linked to secure storage buckets" />
      <Card className="!py-3">
        <p className="text-xs text-ink-400 mb-2">Secure storage buckets (private, row-level-secured):</p>
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => <Badge key={b} color="#c99a2c">{titleCase(b.replace('-', ' '))}</Badge>)}
        </div>
      </Card>
      <ResourceManager config={config} />
    </div>
  );
}
