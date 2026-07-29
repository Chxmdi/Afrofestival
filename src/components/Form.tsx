import { useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'money' | 'date' | 'datetime-local'
  | 'select' | 'boolean' | 'email' | 'url' | 'tel' | 'tags';

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  help?: string;
  colSpan?: 1 | 2;
}

export type FormValues = Record<string, unknown>;

export function Field({
  def, value, onChange,
}: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const t = def.type ?? 'text';
  const id = `f-${def.name}`;

  const control = () => {
    switch (t) {
      case 'textarea':
        return (
          <textarea id={id} className="input min-h-[80px]" placeholder={def.placeholder}
            value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        );
      case 'select':
        return (
          <select id={id} className="input" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {def.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-ember-500" checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)} />
            <span className="text-sm text-ink-200">{def.placeholder ?? 'Yes'}</span>
          </label>
        );
      case 'number':
      case 'money':
        return (
          <input id={id} type="number" className="input" placeholder={def.placeholder}
            min={def.min} max={def.max} step={t === 'money' ? '0.01' : '1'}
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        );
      case 'tags':
        return (
          <input id={id} className="input" placeholder={def.placeholder ?? 'Comma-separated'}
            value={Array.isArray(value) ? (value as string[]).join(', ') : (value as string) ?? ''}
            onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        );
      default:
        return (
          <input id={id} type={t} className="input" placeholder={def.placeholder}
            min={def.min} max={def.max}
            value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        );
    }
  };

  if (t === 'boolean') {
    return (
      <div className={clsx(def.colSpan === 2 && 'sm:col-span-2')}>
        <div className="label">{def.label}{def.required && <span className="text-ember-400"> *</span>}</div>
        {control()}
        {def.help && <p className="mt-1 text-xs text-ink-500">{def.help}</p>}
      </div>
    );
  }

  return (
    <div className={clsx(def.colSpan === 2 && 'sm:col-span-2')}>
      <label htmlFor={id} className="label">
        {def.label}{def.required && <span className="text-ember-400"> *</span>}
      </label>
      {control()}
      {def.help && <p className="mt-1 text-xs text-ink-500">{def.help}</p>}
    </div>
  );
}

/** Controlled dynamic form. Returns cleaned values on submit. */
export function DynamicForm({
  fields, initial, onSubmit, submitLabel = 'Save', onCancel, error, submitting,
  extra,
}: {
  fields: FieldDef[];
  initial?: FormValues;
  onSubmit: (values: FormValues) => void;
  submitLabel?: string;
  onCancel?: () => void;
  error?: string | null;
  submitting?: boolean;
  extra?: ReactNode;
}) {
  const [values, setValues] = useState<FormValues>(() => ({ ...initial }));
  const [touched, setTouched] = useState(false);

  const missing = fields.filter((f) => f.required && !values[f.name] && values[f.name] !== 0);
  const overMax = fields.find(
    (f) => (f.type === 'number' || f.type === 'money') && f.max != null &&
      typeof values[f.name] === 'number' && (values[f.name] as number) > f.max,
  );

  const submit = () => {
    setTouched(true);
    if (missing.length || overMax) return;
    onSubmit(values);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <Field key={f.name} def={f} value={values[f.name]}
            onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
        ))}
      </div>
      {extra}
      {overMax && (
        <p className="text-sm text-ember-400">
          {overMax.label} cannot exceed {overMax.max}.
        </p>
      )}
      {touched && missing.length > 0 && (
        <p className="text-sm text-ember-400">Please complete: {missing.map((m) => m.label).join(', ')}.</p>
      )}
      {error && <p className="text-sm text-ember-400 break-words">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
