import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Home, User, DollarSign, Calendar, HandHeart, LogOut, Loader2 } from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';

const NAV = [
  { to: 'home',    label: 'Home',     icon: Home },
  { to: 'profile', label: 'Profile',  icon: User },
  { to: 'giving',  label: 'My Giving', icon: DollarSign },
  { to: 'events',  label: 'Events',   icon: Calendar },
  { to: 'prayer',  label: 'Prayer',   icon: HandHeart },
];

export default function MemberPortalLayout() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('memberToken');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    memberPortalAPI.getProfile()
      .then(r => setMe(r.data.data))
      .catch(() => { localStorage.removeItem('memberToken'); })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return <Navigate to={`/portal/${churchSlug}/login`} replace />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }
  if (!me) return <Navigate to={`/portal/${churchSlug}/login`} replace />;

  const logout = () => {
    localStorage.removeItem('memberToken');
    navigate(`/portal/${churchSlug}/login`, { replace: true });
  };

  const initials = `${me.firstName?.[0] || ''}${me.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Member Portal</div>
          <div className="font-bold text-gray-900 truncate mt-1">{me.churchName}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{me.firstName} {me.lastName}</div>
              <div className="text-xs text-gray-500 truncate">{me.memberNumber}</div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet context={{ me, refresh: () => memberPortalAPI.getProfile().then(r => setMe(r.data.data)) }} />
      </main>
    </div>
  );
}
