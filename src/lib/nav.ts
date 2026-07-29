import {
  LayoutDashboard, Handshake, Radar, Store, Trophy, Wallet, ListChecks,
  MapPin, ShieldCheck, Users, Music, Megaphone, Contact, FolderOpen,
  FileBarChart, Settings, type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '@/types/db';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: string;
  roles?: AppRole[]; // if set, only these roles see it (owner_admin always sees all)
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },

  { to: '/sponsors', label: 'Sponsor CRM', icon: Handshake, group: 'Revenue', roles: ['sponsorship_lead', 'event_director', 'finance_lead'] },
  { to: '/discovery', label: 'Sponsor Discovery', icon: Radar, group: 'Revenue', roles: ['sponsorship_lead', 'event_director'] },
  { to: '/finance', label: 'Finance', icon: Wallet, group: 'Revenue', roles: ['finance_lead', 'event_director'] },

  { to: '/vendors', label: 'Vendors', icon: Store, group: 'Programme', roles: ['vendor_lead', 'event_director'] },
  { to: '/tournament', label: 'Tournament', icon: Trophy, group: 'Programme', roles: ['tournament_director', 'event_director'] },
  { to: '/programme', label: 'Cultural Programme', icon: Music, group: 'Programme', roles: ['marketing_lead', 'event_director'] },
  { to: '/venues', label: 'Venues & Site', icon: MapPin, group: 'Programme', roles: ['event_director'] },

  { to: '/planning', label: 'Planning', icon: ListChecks, group: 'Operations' },
  { to: '/people', label: 'People & Volunteers', icon: Users, group: 'Operations', roles: ['volunteer_coordinator', 'event_director'] },
  { to: '/compliance', label: 'Compliance & Risk', icon: ShieldCheck, group: 'Operations', roles: ['event_director'] },
  { to: '/marketing', label: 'Marketing', icon: Megaphone, group: 'Operations', roles: ['marketing_lead', 'event_director'] },

  { to: '/contacts', label: 'Contacts', icon: Contact, group: 'Records' },
  { to: '/documents', label: 'Documents', icon: FolderOpen, group: 'Records' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, group: 'Records' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'Records', roles: ['owner_admin'] },
];

export const NAV_GROUPS = ['Overview', 'Revenue', 'Programme', 'Operations', 'Records'];

export function visibleNav(roles: AppRole[]): NavItem[] {
  const isAdmin = roles.includes('owner_admin');
  return NAV.filter((n) => {
    if (!n.roles) return true;
    if (isAdmin) return true;
    return n.roles.some((r) => roles.includes(r));
  });
}
