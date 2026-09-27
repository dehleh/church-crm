import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Home, User, DollarSign, Calendar, HandHeart, LogOut, Loader2,
  Heart, MessageCircle, Users, Menu, X, MapPin, BookOpen, GraduationCap,
  Cake, Film, Bell
} from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';

const NAV = [
  { to: 'home',          label: 'Home',                 icon: Home },
  { to: 'devotionals',   label: 'Daily Devotionals',    icon: BookOpen,      moduleKey: 'devotionals' },
  { to: 'discipleship',  label: 'Discipleship School',  icon: GraduationCap, moduleKey: 'discipleship' },
  { to: 'announcements', label: 'Announcements',        icon: Bell,          moduleKey: 'announcements' },
  { to: 'media',         label: 'Media Library',        icon: Film,          moduleKey: 'media' },
  { to: 'birthdays',     label: 'Birthdays',            icon: Cake,          moduleKey: 'birthdays' },
  { to: 'giving',        label: 'My Giving',            icon: DollarSign,    moduleKey: 'giving' },
  { to: 'events',        label: 'Events & Services',    icon: Calendar,      moduleKey: 'events' },
  { to: 'fellowship',    label: 'Fellowship / Cells',   icon: MapPin,        moduleKey: 'fellowship' },
  { to: 'groups',        label: 'My Groups',            icon: Users,         moduleKey: 'groups' },
  { to: 'prayer',        label: 'Prayer Requests',      icon: HandHeart,     moduleKey: 'prayer' },
  { to: 'counseling',    label: 'Pastoral Counseling',  icon: MessageCircle, moduleKey: 'counseling' },
  { to: 'welfare',       label: 'Welfare Support',      icon: Heart,         moduleKey: 'welfare' },
  { to: 'profile',       label: 'My Profile',           icon: User },
];


export default function MemberPortalLayout() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem('memberToken');

  const refresh = () => memberPortalAPI.getProfile().then(r => setMe(r.data.data));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    refresh()
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
  const churchSettings = me.churchSettings || {};
  const enabledModules = churchSettings.portal?.enabledModules || {};
  const primaryColor = churchSettings.theme?.primaryColor || '#1d4ed8';
  const visibleNav = NAV.filter(it => !it.moduleKey || enabledModules[it.moduleKey] !== false);

  const SidebarBody = () => (
    <>
      <div
        className="p-5 text-white shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #090d16 100%)`
        }}
      >
        <div className="text-[10px] uppercase tracking-widest text-brand-200 font-semibold opacity-90">Member Portal</div>
        <div className="font-bold mt-1 truncate">{me.churchName}</div>
        <div className="flex items-center gap-3 mt-4">
          {me.profilePhotoUrl ? (
            <img src={me.profilePhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center font-bold text-base">{initials}</div>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">{me.firstName} {me.lastName}</div>
            <div className="text-xs text-brand-200 truncate opacity-80">{me.memberNumber}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
        {visibleNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-gray-600">
          <Menu size={20} />
        </button>
        <div className="font-bold text-gray-900 text-sm truncate">{me.churchName}</div>
        {me.profilePhotoUrl ? (
          <img src={me.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">{initials}</div>
        )}
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/20 text-white">
              <X size={18} />
            </button>
            <SidebarBody />
          </aside>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
          <SidebarBody />
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet context={{ me, refresh }} />
        </main>
      </div>
    </div>
  );
}
