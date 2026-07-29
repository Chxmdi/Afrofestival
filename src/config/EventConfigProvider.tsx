import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/auth/AuthProvider';
import { buildEventConfig, DEFAULT_EVENT_CONFIG, type EventConfig } from '@/lib/eventConfig';

interface EventConfigState {
  config: EventConfig;
  isLoading: boolean;
  refresh: () => void;
}

const EventConfigContext = createContext<EventConfigState | undefined>(undefined);

export function EventConfigProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<EventConfig>({
    // re-key on auth state so signing in unlocks staff-only settings (finance)
    queryKey: ['event-config', session ? 'auth' : 'anon'],
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: events }, { data: settings }] = await Promise.all([
        supabase.from('events').select('id,name,tagline,location,timezone,currency,provisional_date,backup_date,capacity_target')
          .is('archived_at', null).order('created_at').limit(1),
        supabase.from('event_settings').select('key,value'),
      ]);
      return buildEventConfig((events?.[0] as never) ?? null, (settings as never) ?? []);
    },
  });

  const value: EventConfigState = {
    config: data ?? DEFAULT_EVENT_CONFIG,
    isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ['event-config'] }),
  };

  return <EventConfigContext.Provider value={value}>{children}</EventConfigContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventConfig(): EventConfigState {
  const ctx = useContext(EventConfigContext);
  if (!ctx) throw new Error('useEventConfig must be used within EventConfigProvider');
  return ctx;
}
