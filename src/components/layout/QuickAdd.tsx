import { useState } from 'react';
import { Plus, Handshake, Store, Trophy, ListChecks, Receipt, FileText } from 'lucide-react';
import { useInsert } from '@/lib/hooks';
import { EVENT, SPONSOR_STAGES, TASK_STATUSES, PRIORITIES, VENDOR_CATEGORIES } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { Popover } from './Popover';

type Kind = 'sponsor' | 'vendor' | 'team' | 'task' | 'expense' | 'document';

const CONFIG: Record<Kind, { table: string; title: string; fields: FieldDef[]; defaults?: FormValues }> = {
  sponsor: {
    table: 'sponsor_prospects', title: 'New Sponsor Prospect',
    defaults: { stage: 'researching', probability: 0.1 },
    fields: [
      { name: 'name', label: 'Organization', required: true, colSpan: 2 },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'industry', label: 'Industry' },
      { name: 'location', label: 'Location' },
      { name: 'stage', label: 'Stage', type: 'select', options: SPONSOR_STAGES.map((s) => ({ value: s.value, label: s.label })) },
      { name: 'suggested_ask', label: 'Suggested Ask (CAD)', type: 'money', min: 0 },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
  },
  vendor: {
    table: 'vendors', title: 'New Vendor',
    defaults: { status: 'submitted' },
    fields: [
      { name: 'legal_name', label: 'Legal Business Name', required: true, colSpan: 2 },
      { name: 'trading_name', label: 'Trading Name' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'black_owned', label: 'Black-owned', type: 'boolean' },
      { name: 'african_caribbean', label: 'African / Caribbean', type: 'boolean' },
      { name: 'vendor_fee', label: 'Vendor Fee (CAD)', type: 'money', min: 0 },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
  },
  team: {
    table: 'teams', title: 'New Team',
    defaults: { registration_status: 'pending', payment_status: 'unpaid', registration_fee: 450 },
    fields: [
      { name: 'name', label: 'Team Name', required: true, colSpan: 2 },
      { name: 'represents', label: 'Represents (community/country)' },
      { name: 'neighbourhood', label: 'Neighbourhood' },
      { name: 'captain_name', label: 'Captain' },
      { name: 'captain_email', label: 'Captain Email', type: 'email' },
      { name: 'registration_fee', label: 'Registration Fee (CAD)', type: 'money', min: 0 },
    ],
  },
  task: {
    table: 'tasks', title: 'New Task',
    defaults: { status: 'todo', priority: 'medium' },
    fields: [
      { name: 'title', label: 'Title', required: true, colSpan: 2 },
      { name: 'department', label: 'Department' },
      { name: 'status', label: 'Status', type: 'select', options: TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES.map((s) => ({ value: s.value, label: s.label })) },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
  },
  expense: {
    table: 'expenses', title: 'New Expense',
    defaults: { approval_status: 'pending', payment_status: 'unpaid' },
    fields: [
      { name: 'description', label: 'Description', required: true, colSpan: 2 },
      { name: 'amount', label: 'Amount (CAD)', type: 'money', required: true, min: 0 },
      { name: 'category', label: 'Category' },
      { name: 'expense_date', label: 'Date', type: 'date' },
      { name: 'is_in_kind', label: 'In-kind', type: 'boolean' },
    ],
  },
  document: {
    table: 'documents', title: 'New Document',
    defaults: { bucket: 'documents' },
    fields: [
      { name: 'title', label: 'Title', required: true, colSpan: 2 },
      { name: 'doc_type', label: 'Type' },
      { name: 'file_url', label: 'File URL', type: 'url', colSpan: 2, help: 'Link to a stored file, or upload via the module page.' },
    ],
  },
};

const MENU: { kind: Kind; label: string; icon: typeof Plus; category: string[] }[] = [
  { kind: 'sponsor', label: 'Sponsor', icon: Handshake, category: VENDOR_CATEGORIES as unknown as string[] },
  { kind: 'vendor', label: 'Vendor', icon: Store, category: [] },
  { kind: 'team', label: 'Team', icon: Trophy, category: [] },
  { kind: 'task', label: 'Task', icon: ListChecks, category: [] },
  { kind: 'expense', label: 'Expense', icon: Receipt, category: [] },
  { kind: 'document', label: 'Document', icon: FileText, category: [] },
];

export function QuickAdd() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insert = useInsert(kind ? CONFIG[kind].table : 'tasks');

  const submit = async (values: FormValues) => {
    if (!kind) return;
    setError(null);
    // enforce fee caps client-side as a courtesy (DB also enforces)
    if (kind === 'expense' && Number(values.amount) < 0) { setError('Amount must be positive'); return; }
    try {
      await insert.mutateAsync(values);
      setKind(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Popover
        button={
          <span className="btn-gold !px-2.5 !py-2" title="Quick add">
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Quick add</span>
          </span>
        }
      >
        {(close) => (
          <div className="w-52 py-1">
            <p className="px-3 py-1.5 text-2xs uppercase tracking-wider text-ink-400">Create new</p>
            {MENU.map((m) => (
              <button
                key={m.kind}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-ink-100 hover:bg-ink-700/60"
                onClick={() => { setError(null); setKind(m.kind); close(); }}
              >
                <m.icon className="h-4 w-4 text-gold-400" /> {m.label}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <Modal open={kind !== null} onClose={() => setKind(null)} title={kind ? CONFIG[kind].title : ''} size="lg">
        {kind && (
          <DynamicForm
            fields={CONFIG[kind].fields}
            initial={CONFIG[kind].defaults}
            onSubmit={submit}
            onCancel={() => setKind(null)}
            error={error}
            submitting={insert.isPending}
            extra={<p className="text-2xs text-ink-500">Fees are capped at CAD ${EVENT.maxPlayerFee} for players and tickets, enforced in the database.</p>}
          />
        )}
      </Modal>
    </>
  );
}
