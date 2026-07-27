import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Menu, X, Search, PanelLeftClose, PanelLeft, LogOut, ChevronDown, Command,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { visibleNav, NAV_GROUPS } from '@/lib/nav';
import { ROLE_LABELS, EVENT } from '@/lib/constants';
import { Avatar } from '@/components/ui';
import { CommandPalette } from './CommandPalette';
import { NotificationCenter } from './NotificationCenter';
import { QuickAdd } from './QuickAdd';
import { Popover } from './Popover';

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 h-16 shrink-0">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 ring-1 ring-gold-500/40">
        <span className="font-display text-gold-400 text-lg leading-none">O</span>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-display text-cream-50 leading-tight truncate">Ojoro</p>
          <p className="text-2xs text-ink-400 truncate">Festival Ops · MTL 2027</p>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { roles } = useAuth();
  const items = visibleNav(roles);
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
      {NAV_GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return null;
        return (
          <div key={group}>
            {!collapsed && (
              <p className="px-3 pb-1 text-2xs uppercase tracking-wider text-ink-500">{group}</p>
            )}
            <div className="space-y-0.5">
              {groupItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      collapsed && 'justify-center',
                      isActive
                        ? 'bg-ink-800 text-cream-50 ring-1 ring-inset ring-ink-700'
                        : 'text-ink-300 hover:text-cream-50 hover:bg-ink-800/60',
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={clsx('h-[18px] w-[18px] shrink-0', isActive && 'text-gold-400')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <Popover
      button={
        <span className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-ink-800">
          <Avatar name={profile?.full_name ?? profile?.email} url={profile?.avatar_url} size={30} />
          <ChevronDown className="h-4 w-4 text-ink-400 hidden sm:block" />
        </span>
      }
    >
      {(close) => (
        <div className="w-60 py-1">
          <div className="px-4 py-3 border-b border-ink-700">
            <p className="text-sm font-medium text-cream-50 truncate">{profile?.full_name ?? profile?.email ?? 'User'}</p>
            <p className="text-xs text-ink-400 truncate">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {roles.length ? roles.map((r) => (
                <span key={r} className="badge bg-forest-700/40 text-forest-300 text-2xs">{ROLE_LABELS[r]}</span>
              )) : <span className="badge bg-ink-700 text-ink-300 text-2xs">No role assigned</span>}
            </div>
          </div>
          {roles.includes('owner_admin') && (
            <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-ink-100 hover:bg-ink-700/60"
              onClick={() => { navigate('/settings'); close(); }}>
              Team & roles
            </button>
          )}
          <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-ember-400 hover:bg-ink-700/60"
            onClick={() => { signOut(); close(); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => localStorage.setItem('sb-collapsed', collapsed ? '1' : '0'), [collapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 texture-grid">
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'no-print hidden md:flex flex-col border-r border-ink-800 bg-ink-900/70 backdrop-blur transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        <Brand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <button
          className="m-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-400 hover:text-cream-50 hover:bg-ink-800"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-72 flex-col border-r border-ink-800 bg-ink-900 animate-fade-in">
            <div className="flex items-center justify-between">
              <Brand collapsed={false} />
              <button className="btn-ghost !px-2 mr-2" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="no-print flex h-16 shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900/60 backdrop-blur px-3 sm:px-4">
          <button className="btn-ghost !px-2 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setCmdOpen(true)}
            className="group flex flex-1 max-w-md items-center gap-2 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm text-ink-400 hover:border-ink-600"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search everything…</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-2xs border border-ink-600 rounded px-1 py-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <div className="flex-1" />
          <QuickAdd />
          <NotificationCenter />
          <UserMenu />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
          <footer className="no-print border-t border-ink-800 px-6 py-4 text-2xs text-ink-500">
            {EVENT.name} · {EVENT.city} · Provisional {EVENT.provisionalDate} (backup {EVENT.backupDate}) ·
            All figures in {EVENT.currency}. SAMPLE records are labelled and separate from real data.
          </footer>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
