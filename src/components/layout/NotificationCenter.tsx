import { Bell, CheckCheck } from 'lucide-react';
import { useRows, useUpdate } from '@/lib/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/types/db';
import { Popover } from './Popover';

const LEVEL_COLOR: Record<string, string> = {
  info: '#9aa0a9', success: '#227d4f', warning: '#e0b64d', critical: '#a02c4a',
};

export function NotificationCenter() {
  const { session } = useAuth();
  const { data: items = [] } = useRows<Notification>('notifications', {
    order: { column: 'created_at', ascending: false },
    limit: 20,
    enabled: Boolean(session),
  });
  const update = useUpdate('notifications');
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover
      button={
        <span className="relative btn-ghost !px-2.5 !py-2" title="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-ember-500 px-1 text-2xs font-semibold text-cream-50 grid place-items-center">
              {unread}
            </span>
          )}
        </span>
      }
    >
      {() => (
        <div className="w-80">
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2.5">
            <p className="text-sm font-medium text-cream-50">Notifications</p>
            {unread > 0 && (
              <button
                className="text-xs text-gold-400 inline-flex items-center gap-1 hover:text-gold-300"
                onClick={() => items.filter((n) => !n.read).forEach((n) => update.mutate({ id: n.id, values: { read: true } }))}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => update.mutate({ id: n.id, values: { read: true } })}
                  className={`flex w-full gap-3 border-b border-ink-800/70 px-4 py-3 text-left hover:bg-ink-800/40 ${n.read ? 'opacity-60' : ''}`}
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: LEVEL_COLOR[n.level] }} />
                  <span className="min-w-0">
                    <span className="block text-sm text-cream-50">{n.title}</span>
                    {n.body && <span className="block text-xs text-ink-400 mt-0.5">{n.body}</span>}
                    <span className="block text-2xs text-ink-500 mt-1">{formatDateTime(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
