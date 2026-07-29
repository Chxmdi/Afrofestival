import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AppRole, Profile } from '@/types/db';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  hasRole: (roles: AppRole[]) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadProfile(data.session.user.id);
    else {
      setProfile(null);
      setRoles([]);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      else {
        setProfile(null);
        setRoles([]);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const hasRole = (want: AppRole[]) => roles.some((r) => want.includes(r));
    return {
      session,
      profile,
      roles,
      loading,
      isStaff: roles.length > 0,
      isAdmin: roles.includes('owner_admin'),
      canEdit: roles.some((r) => r !== 'viewer'),
      hasRole,
      refresh,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [session, profile, roles, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
