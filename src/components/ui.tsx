import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { initials } from '@/lib/format';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

export function SectionTitle({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-xl text-cream-50">{title}</h2>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, sub, accent = 'gold', icon, onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'gold' | 'forest' | 'ember' | 'wine' | 'ink';
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const bar = {
    gold: 'bg-gold-500', forest: 'bg-forest-500', ember: 'bg-ember-500',
    wine: 'bg-wine-500', ink: 'bg-ink-500',
  }[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'card relative overflow-hidden p-4 text-left w-full group',
        onClick && 'hover:border-ink-500 transition-colors cursor-pointer',
      )}
    >
      <span className={clsx('absolute left-0 top-0 h-full w-1', bar)} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xs uppercase tracking-wider text-ink-400 font-semibold">{label}</p>
        {icon && <span className="text-ink-500 group-hover:text-gold-400 transition-colors">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-display font-semibold text-cream-50 tabular-nums">{value}</p>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </button>
  );
}

export function Progress({ value, max = 100, tone = 'gold' }: { value: number; max?: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const bg = { gold: 'bg-gold-500', forest: 'bg-forest-500', ember: 'bg-ember-500', wine: 'bg-wine-500' }[tone] ?? 'bg-gold-500';
  return (
    <div className="h-2 w-full rounded-full bg-ink-700 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({
  children, color, className,
}: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={clsx('badge', className)}
      style={color ? { backgroundColor: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` } : undefined}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, url, size = 32 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name ?? ''} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-forest-700 text-cream-50 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet', message, action, icon,
}: { title?: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="mb-3 text-ink-500">{icon ?? <Inbox className="h-9 w-9" />}</div>
      <p className="text-cream-50 font-medium">{title}</p>
      {message && <p className="text-sm text-ink-400 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <AlertTriangle className="h-8 w-8 text-ember-400 mb-3" />
      <p className="text-cream-50 font-medium">Something went wrong</p>
      <p className="text-sm text-ink-400 mt-1 max-w-md break-words">{msg}</p>
      {retry && <button className="btn-secondary mt-4" onClick={retry}>Try again</button>}
    </div>
  );
}

export function SampleBadge() {
  return (
    <span className="badge bg-gold-500/15 text-gold-300 ring-1 ring-inset ring-gold-500/40" title="Sample / demonstration record">
      SAMPLE
    </span>
  );
}

export function Meter({ score }: { score: number | null | undefined }) {
  const s = Number(score ?? 0);
  const tone = s >= 80 ? '#227d4f' : s >= 60 ? '#c99a2c' : s >= 40 ? '#e87c3f' : '#a02c4a';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-ink-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: tone }} />
      </div>
      <span className="text-xs tabular-nums font-medium" style={{ color: tone }}>{s}</span>
    </div>
  );
}
