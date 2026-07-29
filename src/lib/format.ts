import { EVENT } from './constants';

const cad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});
const cadCents = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 2,
});

export function money(value: number | null | undefined, cents = false): string {
  const n = Number(value ?? 0);
  return (cents ? cadCents : cad).format(n);
}

export function compactMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toFixed(0)}`;
}

export function percent(value: number | null | undefined, digits = 0): string {
  return `${(Number(value ?? 0) * 100).toFixed(digits)}%`;
}

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT.timezone,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT.timezone,
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${dateFmt.format(d)} · ${timeFmt.format(d)}`;
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function daysLate(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export function titleCase(s: string | null | undefined): string {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
