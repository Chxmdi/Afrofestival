import { useMemo, useState } from 'react';
import { ListChecks, Plus, Flag, AlertTriangle, GitBranch } from 'lucide-react';
import { useRows, useInsert, useUpdate } from '@/lib/hooks';
import { TASK_STATUSES, PRIORITIES } from '@/lib/constants';
import { formatDate, daysLate, titleCase } from '@/lib/format';
import type { TaskStatus } from '@/types/db';
import { Card, SectionTitle, Spinner, ErrorState, EmptyState, Badge, StatCard } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

interface Task { id: string; title: string; description: string | null; department: string | null; phase: string | null; status: TaskStatus; priority: string; start_date: string | null; due_date: string | null; estimated_cost: number | null; is_blocker: boolean; blocked_reason: string | null; on_critical_path: boolean; milestone_id: string | null; is_sample?: boolean }
interface Milestone { id: string; title: string; phase: string | null; target_date: string | null; status: string }

const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));
const STATUS_MAP = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s]));

const TASK_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', required: true, colSpan: 2 },
  { name: 'department', label: 'Department' },
  { name: 'phase', label: 'Phase' },
  { name: 'status', label: 'Status', type: 'select', options: TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES.map((s) => ({ value: s.value, label: s.label })) },
  { name: 'start_date', label: 'Start Date', type: 'date' },
  { name: 'due_date', label: 'Due Date', type: 'date' },
  { name: 'estimated_cost', label: 'Estimated Cost (CAD)', type: 'money', min: 0 },
  { name: 'on_critical_path', label: 'On critical path', type: 'boolean' },
  { name: 'is_blocker', label: 'Is a blocker', type: 'boolean' },
  { name: 'blocked_reason', label: 'Blocker reason', colSpan: 2 },
  { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
];

export function Planning() {
  const { canEdit } = useAuth();
  const [tab, setTab] = useState<'board' | 'table' | 'milestones'>('board');
  const { data: tasks = [], isLoading, error, refetch } = useRows<Task>('tasks', { order: { column: 'due_date' } });
  const { data: milestones = [] } = useRows<Milestone>('milestones', { order: { column: 'sort_order' } });
  const insert = useInsert('tasks');
  const update = useUpdate('tasks');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !['done', 'cancelled'].includes(t.status));
    const now = Date.now();
    return {
      total: tasks.length,
      overdue: active.filter((t) => t.due_date && new Date(t.due_date).getTime() < now).length,
      blocked: tasks.filter((t) => t.status === 'blocked' || t.is_blocker).length,
      critical: tasks.filter((t) => t.on_critical_path).length,
    };
  }, [tasks]);

  const submit = async (values: Record<string, unknown>) => {
    setFormError(null);
    try { if (editing === 'new') await insert.mutateAsync(values); else if (editing) await update.mutateAsync({ id: editing.id, values }); setEditing(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : String(e)); }
  };

  const columns: Column<Task>[] = [
    { key: 'title', header: 'Task', sortable: true, render: (t) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-cream-50">{t.title}</span>
          {t.on_critical_path && <Badge color="#a02c4a"><GitBranch className="h-3 w-3" /> Critical</Badge>}
          {t.is_blocker && <Badge color="#e0b64d"><AlertTriangle className="h-3 w-3" /> Blocker</Badge>}
        </div>
        <p className="text-2xs text-ink-400">{t.department ?? '—'} · {t.phase ?? '—'}</p>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (t) => <Badge color={STATUS_MAP[t.status]?.color}>{STATUS_MAP[t.status]?.label}</Badge> },
    { key: 'priority', header: 'Priority', sortable: true, render: (t) => <Badge color={PRIORITY_MAP[t.priority]?.color}>{PRIORITY_MAP[t.priority]?.label}</Badge> },
    { key: 'due_date', header: 'Due', sortable: true, accessor: (t) => t.due_date ?? '', render: (t) => <span>{formatDate(t.due_date)}</span> },
    { key: 'days_late', header: 'Days late', align: 'right', accessor: (t) => daysLate(t.due_date), render: (t) => { const d = t.status === 'done' ? 0 : daysLate(t.due_date); return d > 0 ? <span className="text-ember-400">{d}</span> : <span className="text-ink-500">—</span>; } },
  ];

  return (
    <div className="space-y-5">
      <SectionTitle title="Planning" subtitle="Tasks, milestones, dependencies and critical path across all phases"
        action={canEdit && <button className="btn-primary" onClick={() => { setFormError(null); setEditing('new'); }}><Plus className="h-4 w-4" /> Add task</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tasks" value={stats.total} accent="gold" icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Overdue" value={stats.overdue} accent="wine" />
        <StatCard label="Blocked" value={stats.blocked} accent="ember" />
        <StatCard label="On Critical Path" value={stats.critical} accent="forest" icon={<GitBranch className="h-4 w-4" />} />
      </div>

      <div className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1">
        {([['board', 'Board'], ['table', 'Table'], ['milestones', 'Milestones']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-md px-3 py-1.5 text-sm ${tab === v ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>{l}</button>
        ))}
      </div>

      {isLoading ? <Card><Spinner /></Card> : error ? <Card><ErrorState error={error} retry={refetch} /></Card> : tab === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {TASK_STATUSES.filter((s) => s.value !== 'cancelled').map((col) => {
            const list = tasks.filter((t) => t.status === col.value);
            return (
              <div key={col.value} className="w-72 shrink-0"
                onDragOver={(e) => dragId && e.preventDefault()}
                onDrop={() => { if (dragId && canEdit) { update.mutate({ id: dragId, values: { status: col.value } }); setDragId(null); } }}>
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-cream-50"><span className="h-2 w-2 rounded-full" style={{ background: col.color }} /> {col.label}</span>
                  <span className="text-2xs text-ink-500">{list.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px] rounded-lg bg-ink-900/40 p-1.5">
                  {list.map((t) => (
                    <div key={t.id} draggable={canEdit} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)}
                      onClick={() => { setFormError(null); setEditing(t); }}
                      className="card !p-3 cursor-pointer hover:border-ink-500">
                      <p className="text-sm text-cream-50 leading-snug">{t.title}</p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge color={PRIORITY_MAP[t.priority]?.color}>{PRIORITY_MAP[t.priority]?.label}</Badge>
                        {t.on_critical_path && <Badge color="#a02c4a">Critical</Badge>}
                        {t.due_date && <span className="text-2xs text-ink-400">{formatDate(t.due_date)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'table' ? (
        <DataTable rows={tasks} columns={columns} onRowClick={canEdit ? (t) => { setFormError(null); setEditing(t); } : undefined} empty={<Card><EmptyState title="No tasks yet" /></Card>} />
      ) : (
        <div className="space-y-2">
          {milestones.length === 0 ? <Card><EmptyState title="No milestones" /></Card> : milestones.map((m) => (
            <Card key={m.id} className="flex items-center gap-4 !py-3">
              <Flag className={`h-5 w-5 ${m.status === 'done' ? 'text-forest-400' : m.status === 'at_risk' || m.status === 'missed' ? 'text-ember-400' : 'text-ink-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-cream-50">{m.title}</p>
                <p className="text-2xs text-ink-400">{m.phase ?? '—'}</p>
              </div>
              <span className="text-xs text-ink-300">{formatDate(m.target_date)}</span>
              <Badge color={m.status === 'done' ? '#227d4f' : m.status === 'on_track' ? '#3a9a68' : ['at_risk', 'missed'].includes(m.status) ? '#a02c4a' : '#6b7079'}>{titleCase(m.status)}</Badge>
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New task' : 'Edit task'} size="lg">
        {editing !== null && <DynamicForm fields={TASK_FIELDS} initial={editing === 'new' ? { status: 'todo', priority: 'medium' } : (editing as unknown as Record<string, unknown>)} error={formError} submitting={insert.isPending || update.isPending} onCancel={() => setEditing(null)} onSubmit={submit} />}
      </Modal>
    </div>
  );
}
