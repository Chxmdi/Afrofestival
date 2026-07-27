import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, X, Shield, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { useInsert, useDeleteRow } from '@/lib/hooks';
import { ALL_ROLES, ROLE_LABELS, EVENT } from '@/lib/constants';
import { useAuth } from '@/auth/AuthProvider';
import type { AppRole } from '@/types/db';
import { Card, SectionTitle, Spinner, EmptyState, Badge, Avatar } from '@/components/ui';

interface Member { id: string; full_name: string | null; email: string | null; avatar_url: string | null; roles: AppRole[] }

export function Settings() {
  const { isAdmin } = useAuth();
  const insertRole = useInsert('user_roles');
  const deleteRole = useDeleteRow('user_roles');
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  const { data: members = [], isLoading, refetch } = useQuery<Member[]>({
    queryKey: ['team-members'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,avatar_url').order('full_name'),
        supabase.from('user_roles').select('id,user_id,role'),
      ]);
      const roleMap: Record<string, { id: string; role: AppRole }[]> = {};
      (roles ?? []).forEach((r) => { const rr = r as { id: string; user_id: string; role: AppRole }; (roleMap[rr.user_id] ??= []).push({ id: rr.id, role: rr.role }); });
      return (profiles ?? []).map((p) => {
        const pp = p as { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
        return { ...pp, roles: (roleMap[pp.id] ?? []).map((x) => x.role) };
      });
    },
  });

  const roleRowId = async (userId: string, role: AppRole): Promise<string | null> => {
    const { data } = await supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', role).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  };

  const addRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) return;
    await insertRole.mutateAsync({ user_id: userId, role });
    refetch();
  };
  const removeRole = async (userId: string, role: AppRole) => {
    const id = await roleRowId(userId, role);
    if (id) { await deleteRole.mutateAsync(id); refetch(); }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Settings" subtitle="Team, roles and event configuration" />

      <Card className="!py-3">
        <div className="flex items-start gap-2 text-xs text-ink-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-gold-400" />
          <span>New teammates sign up on the login screen (the first account becomes Owner / Admin). Admins then assign roles below. Row-level security enforces every role — viewers are read-only, finance data is restricted to Finance Lead / Directors, and internal records are never publicly readable.</span>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3">
          <Shield className="h-4 w-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-cream-50">Team members & roles</h3>
        </div>
        {isLoading ? <Spinner /> : members.length === 0 ? <EmptyState title="No team members yet" /> : (
          <div className="divide-y divide-ink-800/70">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={m.full_name ?? m.email} url={m.avatar_url} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream-50 truncate">{m.full_name ?? 'Unnamed'}</p>
                    <p className="text-2xs text-ink-400 truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.roles.length === 0 && <span className="text-2xs text-ink-500">No role</span>}
                  {m.roles.map((r) => (
                    <span key={r} className="badge bg-forest-700/40 text-forest-300">
                      {ROLE_LABELS[r]}
                      {isAdmin && <button className="ml-1 hover:text-ember-400" onClick={() => removeRole(m.id, r)}><X className="h-3 w-3" /></button>}
                    </span>
                  ))}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <select className="input !py-1 !w-auto text-xs" value={selectedRole[m.id] ?? ''} onChange={(e) => setSelectedRole((s) => ({ ...s, [m.id]: e.target.value as AppRole }))}>
                        <option value="">Add role…</option>
                        {ALL_ROLES.filter((r) => !m.roles.includes(r)).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <button className="btn-secondary !px-2 !py-1" onClick={() => addRole(m.id)} disabled={!selectedRole[m.id]}><UserPlus className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-cream-50 mb-3">Event configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          {[['Event', EVENT.name], ['Location', EVENT.city], ['Provisional', EVENT.provisionalDate], ['Backup', EVENT.backupDate],
            ['Timezone', EVENT.timezone], ['Currency', EVENT.currency], ['Capacity', String(EVENT.capacityTarget)], ['Teams', String(EVENT.teams)],
            ['Max player fee', `$${EVENT.maxPlayerFee}`], ['Max ticket price', `$${EVENT.maxTicketPrice}`], ['Sponsor cash goal', `$${EVENT.sponsorCashGoal.toLocaleString()}`], ['Working budget', `$${EVENT.workingBudget.toLocaleString()}`]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-ink-700 p-3"><p className="text-2xs text-ink-400">{l}</p><p className="text-cream-50 mt-0.5">{v}</p></div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ALL_ROLES.map((r) => <Badge key={r} color="#c99a2c">{ROLE_LABELS[r]}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
