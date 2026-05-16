import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Globe, Building2, ScrollText, LogOut, ArrowLeftRight, Menu, X, Mail
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/platform',                   icon: Building2,  label: 'Churches',         end: true },
  { to: '/platform/license-requests',  icon: Mail,       label: 'License Requests' },
  { to: '/platform/audit-log',         icon: ScrollText, label: 'Audit Log' },
];

function getInitials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — dark slate to clearly differentiate from church admin */}
      <aside className={clsx(
        'flex flex-col bg-slate-900 text-slate-200 flex-shrink-0 w-64 z-50',
        'fixed lg:relative inset-y-0 left-0 transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo.png" alt="TMM" className="w-9 h-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-white text-base leading-tight">ChurchOS</div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold">Platform Console</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Switch + user */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {user?.churchId && (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-200 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeftRight size={14} />
              <span>Switch to church view</span>
            </Link>
          )}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-200 flex items-center justify-center text-xs font-bold">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-[10px] uppercase tracking-wide text-indigo-300 font-semibold">Super Admin</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-slate-200 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold uppercase tracking-wide">
              <Globe size={12} /> Platform
            </span>
            <span className="text-sm text-slate-500 hidden sm:inline">Manage all onboarded churches</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
