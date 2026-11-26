import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, UserPlus, CalendarDays, DollarSign,
  Building2, GitBranch, Film, HeartHandshake, LogOut,
  ChevronLeft, ChevronRight, Bell, Menu,
  MessageSquare, ShieldCheck, BarChart2, PiggyBank, CheckSquare,
  Settings, PhoneCall, Users2, Package, HandHeart, Heart,
  User, KeyRound, ClipboardList, Globe, Home, BookOpen, GraduationCap,
  Clock, CreditCard, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasRole, getRoleTitle } from '../../utils/rbac';
import GlobalSearch from '../ui/GlobalSearch';
import { getAssetUrl } from '../../api/client';
import { applyChurchTheme } from '../../utils/theme';
import clsx from 'clsx';

const NAV = [
  {
    group: 'Overview', items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', allowedRoles: ['admin', 'pastor', 'director', 'finance', 'hod'] },
    ]
  },
  {
    group: 'People', items: [
      { to: '/members', icon: Users, label: 'Members', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/first-timers', icon: UserPlus, label: 'First Timers', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/departments', icon: Building2, label: 'Departments', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/fellowship', icon: Home, label: 'Fellowship / Cells', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/groups', icon: Users2, label: 'Groups', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
    ]
  },

  {
    group: 'Church', items: [
      { to: '/events', icon: CalendarDays, label: 'Events', allowedRoles: ['admin', 'pastor', 'director', 'hod', 'finance'] },
      { to: '/devotionals', icon: BookOpen, label: 'Daily Devotionals', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/discipleship', icon: GraduationCap, label: 'Discipleship & School', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/attendance', icon: CheckSquare, label: 'Attendance & Child Check-In', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/communications', icon: MessageSquare, label: 'Communications', allowedRoles: ['admin', 'pastor', 'director'] },
      { to: '/follow-ups', icon: PhoneCall, label: 'Follow-ups', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/prayer', icon: HeartHandshake, label: 'Prayer', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/counseling', icon: HandHeart, label: 'Counseling', allowedRoles: ['admin', 'pastor', 'director'] },
      { to: '/welfare', icon: Heart, label: 'Welfare', allowedRoles: ['admin', 'pastor', 'director', 'finance'] },
      { to: '/media', icon: Film, label: 'Media', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
      { to: '/assets', icon: Package, label: 'Inventory', allowedRoles: ['admin', 'pastor', 'director', 'hod'] },
    ]
  },
  {
    group: 'Finance', items: [
      { to: '/finance', icon: DollarSign, label: 'Finance & Giving', allowedRoles: ['admin', 'pastor', 'finance'] },
      { to: '/giving-campaigns', icon: HeartHandshake, label: 'Campaigns & Projects', allowedRoles: ['admin', 'pastor', 'finance'] },
      { to: '/budgets', icon: PiggyBank, label: 'Budgets', allowedRoles: ['admin', 'pastor', 'director', 'hod', 'finance'] },
      { to: '/procurement', icon: ClipboardList, label: 'Procurement', allowedRoles: ['admin', 'pastor', 'director', 'finance', 'hod'] },
    ]
  },
  {
    group: 'Admin', items: [
      { to: '/branches', icon: GitBranch, label: 'Branches', allowedRoles: ['admin', 'pastor'] },
      { to: '/users', icon: ShieldCheck, label: 'Users', allowedRoles: ['admin', 'pastor'] },
      { to: '/reports', icon: BarChart2, label: 'Reports', allowedRoles: ['admin', 'pastor', 'director', 'finance'] },
      { to: '/settings', icon: Settings, label: 'Settings', allowedRoles: ['admin', 'pastor'] },
    ]
  },
];

function getInitials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Apply church's custom brand colors & theme dynamically across the app
  useEffect(() => {
    applyChurchTheme(user?.theme, {
      name: user?.churchName,
      logoUrl: user?.churchLogoUrl,
      tagline: user?.churchTagline,
      bannerUrl: user?.churchBannerUrl,
      slug: user?.churchSlug,
    });
  }, [user?.theme, user?.churchName, user?.churchLogoUrl, user?.churchTagline, user?.churchBannerUrl, user?.churchSlug]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarTheme = user?.theme?.sidebarTheme || 'light';
  const isDarkSidebar = sidebarTheme === 'dark_slate' || sidebarTheme === 'midnight_navy' || sidebarTheme === 'church_tint';
  const sidebarBg = sidebarTheme === 'midnight_navy'
    ? 'bg-[#090d16] border-r border-gray-800'
    : sidebarTheme === 'dark_slate'
      ? 'bg-slate-900 border-r border-slate-800'
      : sidebarTheme === 'church_tint'
        ? 'bg-brand-950 border-r border-brand-900/60 text-white'
        : 'bg-white border-r border-gray-100';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col flex-shrink-0 transition-all duration-200 z-50',
        sidebarBg,
        `sidebar-${sidebarTheme}`,
        'fixed lg:relative inset-y-0 left-0',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div
          className={clsx(
            'flex items-center border-b flex-shrink-0 cursor-pointer',
            isDarkSidebar ? (sidebarTheme === 'midnight_navy' ? 'border-gray-800' : 'border-slate-800') : 'border-gray-100',
            collapsed ? 'p-3 justify-center' : 'p-4 gap-3'
          )}
          onClick={() => navigate('/dashboard')}
        >
          {user?.churchLogoUrl ? (
            <img
              src={getAssetUrl(user.churchLogoUrl)}
              alt={user.churchName || 'Church Logo'}
              className="w-9 h-9 object-contain rounded-lg flex-shrink-0 bg-white shadow-xs border border-gray-100 p-0.5"
            />
          ) : (
            <img src="/logo.png" alt="ChurchOS" className="w-9 h-9 object-contain flex-shrink-0" />
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className={clsx('font-display font-bold text-base leading-tight truncate', isDarkSidebar ? 'text-white' : 'text-gray-900')}>
                {user?.churchName || 'ChurchOS'}
              </div>
              <div className={clsx('text-[10px] font-body leading-tight truncate max-w-[140px]', isDarkSidebar ? 'text-gray-400' : 'text-gray-400')}>
                {user?.churchTagline || 'Operating System'}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(group => {
            const items = group.items.filter(it => {
              if (it.requiresSuperAdmin && !user?.isSuperAdmin) return false;
              if (it.requiresMultiBranch && !user?.multiBranchEnabled && !user?.isWhitelisted) return false;
              if (it.allowedRoles && !hasRole(user, it.allowedRoles)) return false;
              return true;
            });
            if (!items.length) return null;
            return (
              <div key={group.group} className="mb-1">
                {!collapsed && (
                  <div className={clsx(
                    'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest',
                    isDarkSidebar ? 'text-gray-400' : 'text-gray-400'
                  )}>
                    {group.group}
                  </div>
                )}
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => clsx(
                      'nav-item mb-0.5',
                      collapsed && 'justify-center px-2',
                      isDarkSidebar
                        ? (sidebarTheme === 'dark_slate'
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white')
                        : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700',
                      isActive && 'active'
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={clsx('border-t p-2 flex-shrink-0', isDarkSidebar ? (sidebarTheme === 'midnight_navy' ? 'border-gray-800' : 'border-slate-800') : 'border-gray-100')}>
          {!collapsed ? (
            <div className={clsx('flex items-center gap-2 px-2 py-2 rounded-lg transition-colors', isDarkSidebar ? 'hover:bg-white/5' : 'hover:bg-gray-50')}>
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={clsx('text-sm font-medium truncate', isDarkSidebar ? 'text-gray-200' : 'text-gray-800')}>{user?.firstName} {user?.lastName}</div>
                <div className={clsx('text-xs truncate', isDarkSidebar ? 'text-gray-400' : 'text-gray-400')}>{getRoleTitle(user?.role)}</div>
              </div>
              <button onClick={handleLogout} title="Logout" className={clsx('p-1 rounded transition-colors', isDarkSidebar ? 'text-gray-400 hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50')}>
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Logout" className={clsx('w-full flex items-center justify-center p-2 rounded-lg transition-colors', isDarkSidebar ? 'text-gray-400 hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50')}>
              <LogOut size={16} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className={clsx('hidden lg:flex w-full items-center justify-center p-1.5 mt-1 rounded-lg transition-colors', isDarkSidebar ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400')}
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

          {/* Prominent Church Identity Badge */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50/80 border border-gray-200/70 shadow-2xs">
            {user?.churchLogoUrl ? (
              <img
                src={getAssetUrl(user.churchLogoUrl)}
                alt={user.churchName}
                className="w-5 h-5 object-contain rounded-md bg-white p-0.5 border border-gray-200 shrink-0"
              />
            ) : (
              <Building2 size={16} className="text-brand-600 shrink-0" />
            )}
            <span className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
              {user?.churchName || 'ChurchOS'}
            </span>
            {user?.branchName && (
              <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                {user.branchName}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center gap-3 hidden md:flex">
            <GlobalSearch />
          </div>
          {/* Trial countdown badge */}
          {user && (user.subscriptionPlan === 'trial' || user.subscriptionPlan?.startsWith('trial_')) && !user.isSuperAdmin && (
            <button
              onClick={() => navigate('/settings?tab=subscription')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 text-xs font-semibold border border-amber-200/80 shadow-xs transition-all"
              title="Click to view subscription plans & upgrade"
            >
              <Clock size={13} className="text-amber-600 animate-pulse" />
              <span>
                {user.subscriptionExpiresAt ? (
                  <>Trial: {Math.max(0, Math.ceil((new Date(user.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))} days left</>
                ) : (
                  <>14-Day Trial</>
                )}
              </span>
              <span className="text-[10px] text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded-full font-bold">
                Upgrade
              </span>
            </button>
          )}

          {user?.isSuperAdmin && (
            <button
              onClick={() => navigate('/platform')}
              title="Open Platform Console"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold uppercase tracking-wide transition-colors"
            >
              <Globe size={12} /> Platform
            </button>
          )}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(v => !v); setShowProfileMenu(false); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">Notifications</span>
                  <span className="text-xs text-brand-600 cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No new notifications</div>
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                  <button onClick={() => { setShowNotifications(false); navigate('/communications'); }} className="text-xs text-brand-600 hover:underline">View all communications</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
              className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold hover:ring-2 hover:ring-brand-200 transition-all cursor-pointer"
            >
              {getInitials(user?.firstName, user?.lastName)}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</div>
                  <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
                </div>
                <div className="py-1">
                  {user?.isSuperAdmin && (
                    <button onClick={() => { setShowProfileMenu(false); navigate('/platform'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 transition-colors font-semibold border-b border-gray-100">
                      <Globe size={15} /> Platform Console
                    </button>
                  )}
                  <button onClick={() => { setShowProfileMenu(false); navigate('/settings?tab=theme'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-brand-700 bg-brand-50/50 hover:bg-brand-50 font-medium transition-colors">
                    <Sparkles size={15} /> Church Branding & Theme
                  </button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/settings'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User size={15} /> My Profile
                  </button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/settings?tab=subscription'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-brand-700 bg-brand-50/50 hover:bg-brand-50 font-medium transition-colors">
                    <CreditCard size={15} /> Billing & Plans
                  </button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/settings'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <KeyRound size={15} /> Change Password
                  </button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/settings'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings size={15} /> Settings
                  </button>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* SuperAdmin Impersonation Banner */}
        {user?.isSuperAdmin && user?.isImpersonating && (
          <div className="bg-indigo-900 text-white text-xs px-6 py-2 flex items-center justify-between border-b border-indigo-950 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Platform Super Admin · Currently viewing <strong>{user.churchName}</strong></span>
            </div>
            <button
              onClick={() => navigate('/platform')}
              className="text-xs font-semibold bg-indigo-800 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Globe size={12} /> Return to Platform Console
            </button>
          </div>
        )}

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
