import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, CornerDownLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { NAV } from '@/lib/nav';

interface Result {
  label: string;
  hint: string;
  to: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const { data: records = [] } = useQuery<Result[]>({
    queryKey: ['cmd-search', q],
    enabled: open && isSupabaseConfigured && q.trim().length >= 2,
    queryFn: async () => {
      const term = `%${q.trim()}%`;
      const [sp, vn, tm, tk] = await Promise.all([
        supabase.from('sponsor_prospects').select('id,name,stage').ilike('name', term).limit(5),
        supabase.from('vendors').select('id,trading_name,legal_name').ilike('legal_name', term).limit(5),
        supabase.from('teams').select('id,name').ilike('name', term).limit(5),
        supabase.from('tasks').select('id,title,status').ilike('title', term).limit(5),
      ]);
      const out: Result[] = [];
      (sp.data ?? []).forEach((r) => out.push({ label: (r as { name: string }).name, hint: 'Sponsor', to: `/sponsors/${(r as { id: string }).id}` }));
      (vn.data ?? []).forEach((r) => out.push({ label: (r as { trading_name?: string; legal_name: string }).trading_name || (r as { legal_name: string }).legal_name, hint: 'Vendor', to: '/vendors' }));
      (tm.data ?? []).forEach((r) => out.push({ label: (r as { name: string }).name, hint: 'Team', to: '/tournament' }));
      (tk.data ?? []).forEach((r) => out.push({ label: (r as { title: string }).title, hint: 'Task', to: '/planning' }));
      return out;
    },
  });

  const navMatches = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    return NAV.filter((n) => !term || n.label.toLowerCase().includes(term))
      .slice(0, 6)
      .map((n) => ({ label: n.label, hint: 'Navigate', to: n.to }));
  }, [q]);

  const all = useMemo(() => [...navMatches, ...records], [navMatches, records]);

  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => {
    if (!open) { setQ(''); return; }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, all.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === 'Enter' && all[active]) { navigate(all[active].to); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, all, active, navigate, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl card shadow-pop animate-scale-in overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink-700 px-4">
          <Search className="h-5 w-5 text-ink-400" />
          <input
            autoFocus
            className="flex-1 bg-transparent py-4 text-cream-50 placeholder:text-ink-400 focus:outline-none"
            placeholder="Search sponsors, vendors, teams, tasks — or jump to a page…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd className="hidden sm:block text-2xs text-ink-500 border border-ink-600 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {all.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">
              {q.length >= 2 ? 'No matches' : 'Type at least 2 characters to search records'}
            </p>
          ) : (
            all.map((r, i) => (
              <button
                key={`${r.to}-${i}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => { navigate(r.to); onClose(); }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-ink-700/60' : ''}`}
              >
                <span className="text-cream-50 truncate">{r.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-2xs uppercase tracking-wide text-ink-400">{r.hint}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-500" />}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
