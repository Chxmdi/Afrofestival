import { Link, Outlet } from 'react-router-dom';
import { Trophy, Store, Users, Handshake, Music, ArrowRight, CheckCircle2 } from 'lucide-react';
import { EVENT } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

export function PublicFormsLayout() {
  return (
    <div className="min-h-screen bg-ink-950 texture-grid">
      <header className="border-b border-ink-800 bg-ink-900/60 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/apply" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 ring-1 ring-gold-500/40">
              <span className="font-display text-gold-400 text-lg">O</span>
            </div>
            <div>
              <p className="font-display text-cream-50 leading-tight">{EVENT.shortName}</p>
              <p className="text-2xs text-ink-400">{EVENT.city} · {EVENT.provisionalDate}</p>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-3xl px-4 py-8 text-2xs text-ink-500 text-center">
        {EVENT.name} · {EVENT.tagline}. Submissions are received securely and reviewed by our team.
      </footer>
    </div>
  );
}

const FORMS = [
  { to: 'team', label: 'Register a Team', desc: '7-a-side · 10–12 players', icon: Trophy },
  { to: 'vendor', label: 'Vendor Application', desc: 'Food, fashion, beauty, art & more', icon: Store },
  { to: 'volunteer', label: 'Volunteer Sign-up', desc: 'Join the crew for event day', icon: Users },
  { to: 'sponsor', label: 'Sponsor Inquiry', desc: 'Partner with the festival', icon: Handshake },
  { to: 'performer', label: 'Performer / Creator', desc: 'DJs, dancers, artists, barbers', icon: Music },
];

export function PublicIndex() {
  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-2xs uppercase tracking-wider text-gold-400">Montréal 2027</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Be part of the festival</h1>
        <p className="text-ink-300 mt-2">{EVENT.tagline}. Choose how you'd like to join us.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORMS.map((f) => (
          <Link key={f.to} to={f.to} className="card p-5 flex items-center gap-4 hover:border-ink-500 transition-colors group">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800 ring-1 ring-inset ring-ink-700 group-hover:ring-gold-500/40">
              <f.icon className="h-5 w-5 text-gold-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-cream-50">{f.label}</p>
              <p className="text-xs text-ink-400">{f.desc}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-ink-500 group-hover:text-cream-50" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PublicShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div>
      <Link to="/apply" className="text-sm text-ink-400 hover:text-cream-50">← All forms</Link>
      <div className="mt-3 mb-6">
        <h1 className="font-display text-2xl text-cream-50">{title}</h1>
        <p className="text-sm text-ink-400 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function SuccessScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-10 text-center">
      <CheckCircle2 className="h-12 w-12 text-forest-400 mx-auto mb-4" />
      <h2 className="font-display text-xl text-cream-50">{title}</h2>
      <p className="text-sm text-ink-300 mt-2 max-w-md mx-auto">{message}</p>
      <Link to="/apply" className="btn-secondary mt-6 inline-flex">Back to all forms</Link>
    </div>
  );
}

/** Shared submit hook: inserts into an intake table, with honeypot spam guard. */
export async function submitPublic(
  table: string,
  values: Record<string, unknown>,
  honeypot: string,
): Promise<{ ok: boolean; error?: string; spam?: boolean }> {
  if (honeypot) return { ok: true, spam: true }; // silently drop bots
  const { error } = await supabase.from(table).insert(values);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
