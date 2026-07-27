import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useRows, useInsert, useUpdate, useArchive, type ListOptions } from '@/lib/hooks';
import { downloadCSV } from '@/lib/format';
import { useAuth } from '@/auth/AuthProvider';
import { DataTable, type Column } from './DataTable';
import { DynamicForm, type FieldDef, type FormValues } from './Form';
import { Modal } from './Modal';
import { Card, EmptyState, ErrorState, SectionTitle, Spinner } from './ui';

/** Loose row shape for config-driven resource pages. */
export type AnyRow = { id: string } & Record<string, unknown>;

export interface ResourceConfig<T extends { id: string }> {
  table: string;
  title: string;
  subtitle?: string;
  list?: ListOptions;
  columns: Column<T>[];
  fields?: FieldDef[];
  searchKeys?: (keyof T | string)[];
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  defaults?: FormValues;
  addLabel?: string;
  softDelete?: boolean;
  onRowClick?: (row: T) => void;
  csvName?: string;
  emptyMessage?: string;
}

export function ResourceManager<T extends { id: string }>({ config }: { config: ResourceConfig<T> }) {
  const { canEdit } = useAuth();
  const { data, isLoading, error, refetch } = useRows<T>(config.table, config.list);
  const insert = useInsert(config.table);
  const update = useUpdate(config.table);
  const archive = useArchive(config.table, config.softDelete ?? true);

  const [search, setSearch] = useState('');
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<T | null | 'new'>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(() => {
    let out = data ?? [];
    const q = search.trim().toLowerCase();
    if (q && config.searchKeys?.length) {
      out = out.filter((r) =>
        config.searchKeys!.some((k) =>
          String((r as Record<string, unknown>)[k as string] ?? '').toLowerCase().includes(q)),
      );
    }
    for (const [k, v] of Object.entries(filterVals)) {
      if (v) out = out.filter((r) => String((r as Record<string, unknown>)[k] ?? '') === v);
    }
    return out;
  }, [data, search, filterVals, config.searchKeys]);

  const startEdit = (row: T | 'new') => { setFormError(null); setEditing(row); };

  const handleSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      if (editing === 'new') await insert.mutateAsync(values);
      else if (editing) await update.mutateAsync({ id: editing.id, values });
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <SectionTitle
        title={config.title}
        subtitle={config.subtitle}
        action={
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button className="btn-secondary" onClick={() => downloadCSV(config.csvName ?? config.table, rows as Record<string, unknown>[])}>
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            )}
            {config.fields && canEdit && (
              <button className="btn-primary" onClick={() => startEdit('new')}>
                <Plus className="h-4 w-4" /> {config.addLabel ?? 'Add'}
              </button>
            )}
          </div>
        }
      />

      {(config.searchKeys?.length || config.filters?.length) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {config.searchKeys?.length ? (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input className="input pl-9" placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          ) : null}
          {config.filters?.map((f) => (
            <select key={f.key} className="input w-auto" value={filterVals[f.key] ?? ''}
              onChange={(e) => setFilterVals((s) => ({ ...s, [f.key]: e.target.value }))}>
              <option value="">{f.label}: All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card><Spinner /></Card>
      ) : error ? (
        <Card><ErrorState error={error} retry={refetch} /></Card>
      ) : (
        <DataTable
          rows={rows}
          columns={config.columns}
          onRowClick={config.onRowClick ?? (config.fields && canEdit ? (r) => startEdit(r) : undefined)}
          empty={<Card><EmptyState message={config.emptyMessage} action={
            config.fields && canEdit ? <button className="btn-primary" onClick={() => startEdit('new')}><Plus className="h-4 w-4" /> {config.addLabel ?? 'Add'}</button> : undefined
          } /></Card>}
          rowActions={config.fields && canEdit ? (row) => (
            <div className="flex items-center justify-end gap-1">
              <button className="btn-ghost !px-2 !py-1" title="Edit" onClick={() => startEdit(row)}>
                <Pencil className="h-4 w-4" />
              </button>
              <button className="btn-ghost !px-2 !py-1 hover:text-ember-400" title="Archive"
                onClick={() => { if (confirm('Archive this record?')) archive.mutate(row.id); }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : undefined}
        />
      )}

      {config.fields && (
        <Modal
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={editing === 'new' ? `New ${config.addLabel ?? 'record'}` : `Edit ${config.addLabel ?? 'record'}`}
          size="lg"
        >
          <DynamicForm
            fields={config.fields}
            initial={editing === 'new' || editing === null ? config.defaults : (editing as FormValues)}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            error={formError}
            submitting={insert.isPending || update.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
