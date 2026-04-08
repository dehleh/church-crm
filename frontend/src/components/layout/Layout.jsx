import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, UserPlus, CalendarDays, DollarSign,
  Building2, GitBranch, Film, HeartHandshake, LogOut,
  ChevronLeft, ChevronRight, Bell, Menu,
  MessageSquare, ShieldCheck, BarChart2, PiggyBank, CheckSquare,
  Settings, PhoneCall, Users2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlobalSearch from '../ui/GlobalSearch';
import clsx from 'clsx';

const NAV = [
  { group: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'People', items: [
    { to: '/members',      icon: Users,         label: 'Members' },
    { to: '/first-timers', icon: UserPlus,      label: 'First Timers' },
    { to: '/departments',  icon: Building2,     label: 'Departments' },
    { to: '/groups',       icon: Users2,        label: 'Groups' },
  ]},
  { group: 'Church', items: [
    { to: '/events',         icon: CalendarDays,   label: 'Events' },
    { to: '/attendance',     icon: CheckSquare,    label: 'Attendance' },
    { to: '/communications', icon: MessageSquare,  label: 'Communications' },
    { to: '/follow-ups',     icon: PhoneCall,      label: 'Follow-ups' },
    { to: '/prayer',         icon: HeartHandshake, label: 'Prayer' },
    { to: '/media',          icon: Film,           label: 'Media' },
  ]},
  { group: 'Finance', items: [
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/budgets', icon: PiggyBank,  label: 'Budgets' },
  ]},
  { group: 'Admin', items: [
    { to: '/branches', icon: GitBranch,   label: 'Branches' },
    { to: '/users',    icon: ShieldCheck, label: 'Users' },
    { to: '/reports',  icon: BarChart2,   label: 'Reports' },
    { to: '/settings', icon: Settings,    label: 'Settings' },
  ]},
];

function getInitials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-200 z-50',
        'fixed lg:relative inset-y-0 left-0',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className={clsx('flex items-center border-b border-gray-100 flex-shrink-0', collapsed ? 'p-3 justify-center' : 'p-4 gap-3')}>
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">⛪</span>
          </div>
          {!collapsed && (
            <div>
              <div className="font-display font-bold text-gray-900 text-base leading-tight">ChurchOS</div>
              <div className="text-[10px] text-gray-400 font-body leading-tight truncate max-w-[120px]">{user?.churchName}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(group => (
            <div key={group.group} className="mb-1">
              {!collapsed && (
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.group}
                </div>
              )}
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) => clsx(
                    'nav-item mb-0.5',
                    collapsed && 'justify-center px-2',
                    isActive && 'active'
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-2 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-gray-400 truncate capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={handleLogout} title="Logout" className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Logout" className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden lg:flex w-full items-center justify-center p-1.5 mt-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-6 bg-white border-b border-gray-100 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(v => !v)}>
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 flex items-center gap-3 hidden md:flex">
            <GlobalSearch />
          </div>
          <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
