import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Store, Check, Clock, X, AlertTriangle } from 'lucide-react';
import { useRows, useUpdate, useInsert } from '@/lib/hooks';
import { money, titleCase, formatDate } from '@/lib/format';
import { Card, SectionTitle, Spinner, ErrorState, EmptyState, Badge, StatCard } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

interface Vendor { id: string; legal_name: string; trading_name: string | null; status: string; category_id: string | null; black_owned: boolean | null; african_caribbean: boolean | null; vendor_fee: number; deposit: number; invoice_status: string; contract_status: string; review_score: number | null; logistics_ready: boolean; is_sample?: boolean }
interface VendorApp { id: string; legal_name: string; trading_name: string | null; contact_name: string; email: string; phone: string | null; category: string; black_owned: boolean | null; status: string; food_permit: boolean; insurance: boolean; review_score: number | null; created_at: string }
interface VendorDoc { vendor_id: string; doc_type: string; status: string; expiry_date: string | null }
interface Category { id: string; key: string; label: string }

const STATUS_COLOR: Record<string, string> = { approved: '#227d4f', under_review: '#c99a2c', submitted: '#6b7079', waitlisted: '#e87c3f', rejected: '#a02c4a', withdrawn: '#33363d' };

const VENDOR_FIELDS: FieldDef[] = [
  { name: 'legal_name', label: 'Legal Business Name', required: true, colSpan: 2 },
  { name: 'trading_name', label: 'Trading Name' },
  { name: 'website', label: 'Website', type: 'url' },
  { name: 'black_owned', label: 'Black-owned', type: 'boolean' },
  { name: 'african_caribbean', label: 'African / Caribbean', type: 'boolean' },
  { name: 'vendor_fee', label: 'Vendor Fee (CAD)', type: 'money', min: 0 },
  { name: 'deposit', label: 'Deposit (CAD)', type: 'money', min: 0 },
  { name: 'review_score', label: 'Review Score (0-100)', type: 'number', min: 0, max: 100 },
  { name: 'status', label: 'Status', type: 'select', options: ['submitted', 'under_review', 'approved', 'waitlisted', 'rejected'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'logistics_ready', label: 'Logistics ready', type: 'boolean' },
  { name: 'internal_notes', label: 'Internal notes', type: 'textarea', colSpan: 2 },
];

export function Vendors() {
  const { canEdit } = useAuth();
  const [tab, setTab] = useState<'queue' | 'directory'>('queue');
  const { data: vendors = [], isLoading, error, refetch } = useRows<Vendor>('vendors', { order: { column: 'created_at', ascending: false } });
  const { data: apps = [] } = useRows<VendorApp>('vendor_applications', { order: { column: 'created_at', ascending: false } });
  const { data: docs = [] } = useRows<VendorDoc>('vendor_documents');
  const { data: cats = [] } = useRows<Category>('vendor_categories', { order: { column: 'sort_order' } });
  const updateApp = useUpdate('vendor_applications');
  const insertVendor = useInsert('vendors');
  const updateVendor = useUpdate('vendors');
  const [editing, setEditing] = useState<Vendor | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.label])), [cats]);
  const missingDocVendors = useMemo(() => new Set(docs.filter((d) => ['missing', 'expired'].includes(d.status)).map((d) => d.vendor_id)), [docs]);

  const catChart = useMemo(() => {
    const counts: Record<string, number> = {};
    vendors.forEach((v) => { const k = v.category_id ? catMap[v.category_id] ?? 'Other' : 'Unassigned'; counts[k] = (counts[k] ?? 0) + 1; });
    const palette = ['#227d4f', '#d75f24', '#a02c4a', '#c99a2c', '#3a9a68', '#e87c3f', '#bd4f6b', '#e0b64d', '#6b7079', '#164a31'];
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [vendors, catMap]);

  const approveApp = async (app: VendorApp) => {
    const cat = cats.find((c) => c.label.toLowerCase() === app.category.toLowerCase() || c.key === app.category);
    await insertVendor.mutateAsync({
      legal_name: app.legal_name, trading_name: app.trading_name, category_id: cat?.id ?? null,
      black_owned: app.black_owned, african_caribbean: app.black_owned, status: 'approved', review_score: app.review_score,
    });
    await updateApp.mutateAsync({ id: app.id, values: { status: 'approved' } });
    refetch();
  };

  const columns: Column<Vendor>[] = [
    { key: 'legal_name', header: 'Vendor', sortable: true, render: (v) => (
      <div className="flex items-center gap-2">
        <div><p className="font-medium text-cream-50">{v.trading_name || v.legal_name}</p><p className="text-2xs text-ink-400">{v.category_id ? catMap[v.category_id] : '—'}</p></div>
        {v.black_owned && <Badge color="#c99a2c">Black-owned</Badge>}
        {v.is_sample && <Badge color="#c99a2c">SAMPLE</Badge>}
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (v) => <Badge color={STATUS_COLOR[v.status]}>{titleCase(v.status)}</Badge> },
    { key: 'docs', header: 'Documents', render: (v) => missingDocVendors.has(v.id) ? <Badge color="#a02c4a"><AlertTriangle className="h-3 w-3" /> Missing</Badge> : <Badge color="#227d4f">Complete</Badge> },
    { key: 'vendor_fee', header: 'Fee', sortable: true, accessor: (v) => v.vendor_fee, align: 'right', render: (v) => money(v.vendor_fee) },
    { key: 'invoice_status', header: 'Payment', render: (v) => <Badge color={v.invoice_status === 'paid' ? '#227d4f' : v.invoice_status === 'partial' ? '#c99a2c' : '#a02c4a'}>{titleCase(v.invoice_status)}</Badge> },
    { key: 'logistics_ready', header: 'Logistics', align: 'center', render: (v) => v.logistics_ready ? <Check className="h-4 w-4 text-forest-400 inline" /> : <Clock className="h-4 w-4 text-ink-500 inline" /> },
  ];

  const queue = apps.filter((a) => !['approved', 'rejected'].includes(a.status));

  return (
    <div className="space-y-5">
      <SectionTitle title="Vendors" subtitle="Application review queue and approved-vendor directory"
        action={canEdit && <button className="btn-primary" onClick={() => { setFormError(null); setEditing('new'); }}><Store className="h-4 w-4" /> Add vendor</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Applications" value={apps.length} accent="gold" />
        <StatCard label="Approved" value={vendors.filter((v) => v.status === 'approved').length} accent="forest" />
        <StatCard label="Missing Documents" value={missingDocVendors.size} accent="wine" />
        <StatCard label="Fees Booked" value={money(vendors.reduce((a, v) => a + Number(v.vendor_fee || 0), 0))} accent="ember" />
      </div>

      <div className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1">
        {([['queue', `Review queue (${queue.length})`], ['directory', `Directory (${vendors.length})`]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-md px-3 py-1.5 text-sm ${tab === v ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>{label}</button>
        ))}
      </div>

      {isLoading ? <Card><Spinner /></Card> : error ? <Card><ErrorState error={error} retry={refetch} /></Card> : tab === 'queue' ? (
        <Card className="!p-0 overflow-hidden">
          {queue.length === 0 ? <EmptyState title="Queue is clear" message="No pending vendor applications. Public submissions appear here." /> : (
            <div className="divide-y divide-ink-800/70">
              {queue.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-cream-50">{a.trading_name || a.legal_name}</p>
                      <Badge color="#6b7079">{titleCase(a.category)}</Badge>
                      {a.black_owned && <Badge color="#c99a2c">Black-owned</Badge>}
                    </div>
                    <p className="text-2xs text-ink-400 mt-0.5">{a.contact_name} · {a.email} · {formatDate(a.created_at)}</p>
                    <div className="mt-1 flex gap-2 text-2xs">
                      <span className={a.food_permit ? 'text-forest-300' : 'text-ink-500'}>Food permit {a.food_permit ? '✓' : '—'}</span>
                      <span className={a.insurance ? 'text-forest-300' : 'text-ink-500'}>Insurance {a.insurance ? '✓' : '—'}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 shrink-0">
                      <button className="btn-ghost !px-2 hover:text-ember-400" onClick={() => updateApp.mutate({ id: a.id, values: { status: 'rejected' } })}><X className="h-4 w-4" /> Reject</button>
                      <button className="btn-secondary" onClick={() => updateApp.mutate({ id: a.id, values: { status: 'under_review' } })}>Review</button>
                      <button className="btn-primary" onClick={() => approveApp(a)}><Check className="h-4 w-4" /> Approve</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DataTable rows={vendors} columns={columns} onRowClick={canEdit ? (v) => { setFormError(null); setEditing(v); } : undefined}
              empty={<Card><EmptyState title="No vendors yet" /></Card>} />
          </div>
          <Card className="!p-0 overflow-hidden h-fit">
            <div className="px-5 pt-4"><h3 className="text-sm font-semibold text-cream-50">By category</h3></div>
            {catChart.length ? (
              <div className="p-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={catChart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {catChart.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1c1e22', border: '1px solid #33363d', borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="px-3 pb-3 space-y-1">
                  {catChart.map((c) => <div key={c.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-ink-300"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span><span className="text-ink-400">{c.value}</span></div>)}
                </div>
              </div>
            ) : <EmptyState title="No data" />}
          </Card>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add vendor' : 'Edit vendor'} size="lg">
        {editing !== null && (
          <DynamicForm fields={VENDOR_FIELDS} initial={editing === 'new' ? { status: 'submitted' } : (editing as unknown as Record<string, unknown>)}
            error={formError} submitting={insertVendor.isPending || updateVendor.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              setFormError(null);
              try {
                if (editing === 'new') await insertVendor.mutateAsync(values);
                else await updateVendor.mutateAsync({ id: editing.id, values });
                setEditing(null);
              } catch (e) { setFormError(e instanceof Error ? e.message : String(e)); }
            }} />
        )}
      </Modal>
    </div>
  );
}
