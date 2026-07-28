import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { useEventConfig } from '@/config/EventConfigProvider';
import { AlertTriangle } from 'lucide-react';

export function Login() {
  const { config: EVENT } = useEventConfig();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setNotice(null); setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) setNotice('Account created. You can now sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-950">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 texture-diag bg-ink-900 border-r border-ink-800 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ember-600/20 blur-3xl" />
        <div className="absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-forest-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-ink-800 ring-1 ring-gold-500/40">
            <span className="font-display text-gold-400 text-xl">O</span>
          </div>
          <span className="font-display text-cream-50 text-lg">Ojoro Festival Ops</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl text-cream-50 leading-tight">
            The single source of truth for {EVENT.name.replace('Ojoro ', '')}.
          </h1>
          <p className="mt-4 text-ink-300">
            {EVENT.tagline} — {EVENT.city}. 16 teams, one festival, every contact, decision,
            payment and deadline in one operations platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Sponsors', 'Vendors', 'Tournament', 'Finance', 'Volunteers', 'Compliance'].map((t) => (
              <span key={t} className="badge bg-ink-800 text-ink-200 ring-1 ring-inset ring-ink-700">{t}</span>
            ))}
          </div>
        </div>
        <p className="relative text-2xs text-ink-500">Provisional {EVENT.provisionalDate} · Backup {EVENT.backupDate} · {EVENT.currency}</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-800 ring-1 ring-gold-500/40">
              <span className="font-display text-gold-400 text-lg">O</span>
            </div>
            <span className="font-display text-cream-50">Ojoro Festival Ops</span>
          </div>

          <h2 className="text-2xl text-cream-50">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="text-sm text-ink-400 mt-1">
            {mode === 'signin' ? 'Sign in to the operations platform.' : 'The first account becomes the Owner / Admin.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 flex gap-2 rounded-lg border border-ember-600/40 bg-ember-600/10 p-3 text-xs text-ember-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>, then restart.</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="text-sm text-ember-400">{error}</p>}
            {notice && <p className="text-sm text-forest-300">{notice}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading || !isSupabaseConfigured}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button className="text-gold-400 hover:text-gold-300" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null); }}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
