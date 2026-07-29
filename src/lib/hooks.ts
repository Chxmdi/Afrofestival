import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { isSupabaseConfigured } from './env';

export interface ListOptions {
  select?: string;
  order?: { column: string; ascending?: boolean };
  eq?: Record<string, string | number | boolean>;
  limit?: number;
  enabled?: boolean;
}

/** Generic list query for any table. */
export function useRows<T = Record<string, unknown>>(table: string, opts: ListOptions = {}) {
  return useQuery<T[]>({
    queryKey: [table, opts],
    enabled: isSupabaseConfigured && (opts.enabled ?? true),
    queryFn: async () => {
      let q = supabase.from(table).select(opts.select ?? '*');
      if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useRow<T = Record<string, unknown>>(table: string, id: string | undefined, select = '*') {
  return useQuery<T | null>({
    queryKey: [table, 'one', id],
    enabled: isSupabaseConfigured && Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select(select).eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data as T) ?? null;
    },
  });
}

/** Invalidate every query touching a table. */
function useInvalidate(table: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [table] });
}

export function useInsert(table: string) {
  const invalidate = useInvalidate(table);
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).insert(values).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdate(table: string) {
  const invalidate = useInvalidate(table);
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Soft-delete when the table has archived_at, else hard-delete. */
export function useArchive(table: string, softDelete = true) {
  const invalidate = useInvalidate(table);
  return useMutation({
    mutationFn: async (id: string) => {
      if (softDelete) {
        const { error } = await supabase
          .from(table)
          .update({ archived_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRow(table: string) {
  const invalidate = useInvalidate(table);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
