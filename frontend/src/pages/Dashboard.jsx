import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, CalendarDays, DollarSign,
  TrendingUp, TrendingDown, ArrowRight, Clock, Sparkles,
  CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, X, GitBranch, UserCheck,
  Send, CheckSquare
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { dashboardAPI } from '../api/services';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { getAssetUrl } from '../api/client';

const fmt = (n) => Number(n || 0).toLocaleString();

function StatCard({ icon: Icon, label, value, sub, subUp, color = 'brand', to }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const borderAccents = {
    brand: 'border-t-brand-500',
    green: 'border-t-emerald-500',
    amber: 'border-t-amber-500',
    purple: 'border-t-purple-500',
  };
  const card = (
    <div className={`card rounded-2xl border-t-2 ${borderAccents[color]} hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer p-5 flex items-start gap-4`}>
      <div className={`stat-icon rounded-2xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display leading-tight">{value}</p>
        {sub && (
          <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${subUp ? 'text-emerald-600' : 'text-gray-400'}`}>
            {subUp ? <TrendingUp size={12} /> : null}{sub}
          </p>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{card}</Link> : card;
}

const CustomTooltip = ({ active, payload, label, currencyCode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name.includes('income') || p.name.includes('expense') ? formatCurrency(p.value, currencyCode) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const currency = (n) => formatCurrency(n, user?.currency);
  const currencySymbol = getCurrencySymbol(user?.currency).trim();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guideDismissed, setGuideDismissed] = useState(() => {
    return localStorage.getItem('churchos_guide_dismissed') === 'true';
  });
  const [guideCollapsed, setGuideCollapsed] = useState(false);

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activityColors = { new_member: '#3b6ef6', first_timer: '#f59e0b', transaction: '#10b981' };
  const activityLabels = { new_member: 'New member', first_timer: 'First timer', transaction: 'Transaction' };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  const trendData = (data?.finance?.monthlyTrend || []).map(r => ({
    month: format(parseISO(r.month), 'MMM'),
    income: Number(r.income || 0),
    expense: Number(r.expense || 0),
  }));

  const attendanceTrend = (data?.attendanceTrend || []).reverse().map(r => ({
    name: r.title?.length > 14 ? r.title.slice(0, 14) + '…' : r.title,
    attendance: Number(r.actual_attendance || 0),
  }));

  // Trial duration calculation
  const daysLeft = user?.subscriptionExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 14;
  const isUrgent = daysLeft <= 3;
  const isTrial = user && (user.subscriptionPlan === 'trial' || user.subscriptionPlan?.startsWith('trial_')) && !user.isSuperAdmin;

  // Checklist items
  const hasMembers = Number(data?.members?.total || 0) > 0;
  const hasEvents = Number(data?.events?.upcoming || 0) > 0 || (data?.attendanceTrend && data.attendanceTrend.length > 0);
  const hasFinance = Number(data?.finance?.month_income || 0) > 0 || Number(data?.finance?.month_expense || 0) > 0;
  const hasCampusOrTeam = Boolean(user?.multiBranchEnabled ? true : (localStorage.getItem('churchos_team_setup_done') === 'true'));

  const checklist = [
    {
      id: 'members',
      title: 'Add your congregation members',
      desc: 'Register first members manually or import your existing directory via CSV.',
      done: hasMembers,
      to: '/members',
      actionLabel: 'Add Members',
    },
    {
      id: 'events',
      title: 'Schedule a service or church event',
      desc: 'Create your Sunday service or weekly fellowship to start tracking attendance.',
      done: hasEvents,
      to: '/events',
      actionLabel: 'Create Event',
    },
    {
      id: 'finance',
      title: 'Record tithes & offerings',
      desc: 'Log church donations or expenses to generate automated financial summaries.',
      done: hasFinance,
      to: '/finance',
      actionLabel: 'Record Giving',
    },
    {
      id: 'branches',
      title: user?.multiBranchEnabled ? 'Setup Campus Branches' : 'Invite Pastoral Team & Staff',
      desc: user?.multiBranchEnabled
        ? 'Add your regional branches and assign campus pastors.'
        : 'Invite ministers and administrators to collaborate on ChurchOS.',
      done: hasCampusOrTeam,
      to: user?.multiBranchEnabled ? '/branches' : '/users',
      actionLabel: user?.multiBranchEnabled ? 'Manage Branches' : 'Invite Team',
    },
  ];

  const completedCount = checklist.filter(c => c.done).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  const handleDismissGuide = () => {
    localStorage.setItem('churchos_guide_dismissed', 'true');
    setGuideDismissed(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Executive Command Hero Banner */}
      <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {user?.churchLogoUrl ? (
              <img
                src={getAssetUrl(user.churchLogoUrl)}
                alt={user?.churchName || 'Church Logo'}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-white p-1.5 shadow-lg border border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-display font-black text-2xl sm:text-3xl flex-shrink-0 shadow-inner">
                {(user?.churchName || 'C')[0]}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-brand-200 border border-white/10">
                  Sanctuary Command Center
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  • {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                {user?.churchName || 'ChurchOS'}{user?.churchTagline ? ` — ${user.churchTagline}` : ''}
              </p>
            </div>
          </div>

          {/* Quick-Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t border-white/10 lg:border-t-0">
            <Link
              to="/members"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/15 transition flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus size={14} className="text-brand-300" />
              <span>New Member</span>
            </Link>
            <Link
              to="/finance"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/15 transition flex items-center gap-1.5 shadow-xs"
            >
              <DollarSign size={14} className="text-emerald-300" />
              <span>Record Giving</span>
            </Link>
            <Link
              to="/communications"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/15 transition flex items-center gap-1.5 shadow-xs"
            >
              <Send size={14} className="text-sky-300" />
              <span>Broadcast</span>
            </Link>
            <Link
              to="/departments"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition flex items-center gap-1.5 shadow-md shadow-brand-500/25"
            >
              <CheckSquare size={14} />
              <span>Service Readiness</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {isTrial && (
        <div
          className={`mb-6 p-4 sm:p-5 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
            isUrgent
              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-orange-600/20 border border-amber-300/30'
              : 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 shadow-brand-600/15'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-amber-400/20 text-white' : 'bg-white/15'}`}>
              {isUrgent ? (
                <AlertTriangle size={22} className="text-amber-200 animate-pulse" />
              ) : (
                <Sparkles size={20} className="text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-base">
                  {isUrgent ? '⚠️ Urgent: Trial Expiring Soon' : '14-Day Full Access Trial'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-rose-900/60 text-white border border-rose-400/30' : 'bg-white/20 backdrop-blur'}`}>
                  {daysLeft === 0 ? 'Expires today' : `${daysLeft} days remaining`}
                </span>
                <span className="text-[11px] bg-black/15 font-medium px-2 py-0.5 rounded-full hidden sm:inline-block">
                  {user.multiBranchEnabled ? 'Multi-Branch (Growth: ₦600k/yr)' : 'Single Branch (Starter: ₦250k/yr)'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isUrgent ? 'text-amber-100 font-medium' : 'text-brand-100'}`}>
                {isUrgent
                  ? `Your trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Subscribe to an annual plan now to keep your records accessible and prevent campus lockouts.`
                  : 'Enjoy full access to ChurchOS. Subscribe to an annual plan anytime to lock in your church network and keep going uninterrupted.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0">
            <Link
              to="/settings?tab=subscription"
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap w-full md:w-auto ${
                isUrgent
                  ? 'bg-white text-orange-700 hover:bg-orange-50'
                  : 'bg-white text-brand-700 hover:bg-brand-50'
              }`}
            >
              {isUrgent ? 'Subscribe to Annual Plan' : 'Subscribe to Plan'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Getting Started Guide */}
      {!guideDismissed && (
        <div className="mb-6 card border border-brand-100/80 bg-gradient-to-br from-brand-50/40 via-white to-white shadow-xs p-5 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                {completedCount}/{checklist.length}
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-900 text-sm">Getting Started Checklist</h3>
                <p className="text-xs text-gray-500">Complete these key steps to get your ministry fully operational on ChurchOS.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuideCollapsed(!guideCollapsed)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-xs flex items-center gap-1"
                title={guideCollapsed ? 'Expand guide' : 'Collapse guide'}
              >
                {guideCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              <button
                onClick={handleDismissGuide}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-xs"
                title="Dismiss checklist"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500 mb-1">
              <span>Setup Progress</span>
              <span className="text-brand-600">{progressPercent}% Completed</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          {!guideCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                    item.done
                      ? 'bg-emerald-50/40 border-emerald-200/60'
                      : 'bg-white border-gray-100 hover:border-brand-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {item.done ? (
                      <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`text-xs font-semibold ${item.done ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  {!item.done && (
                    <Link
                      to={item.to}
                      className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] whitespace-nowrap transition flex-shrink-0 flex items-center gap-1"
                    >
                      {item.actionLabel} <ArrowRight size={10} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Service Readiness Command Center */}
      {data?.serviceReadiness ? (
        <div className="card mb-6 border border-brand-100 bg-white overflow-hidden shadow-xs p-0">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-900 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-brand-300 flex-shrink-0">
                  <CheckSquare size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-brand-500/30 text-brand-200 border border-brand-400/30">
                      Service Readiness Command
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold font-display text-white mt-1">
                    {data.serviceReadiness.serviceTitle || 'Upcoming Service Readiness'}
                  </h2>
                  <p className="text-xs text-brand-200">
                    {data.serviceReadiness.serviceDate ? format(parseISO(data.serviceReadiness.serviceDate), 'EEEE, MMMM d, yyyy') : 'Service Scheduled'}
                    {data.serviceReadiness.serviceTime ? ` • ${data.serviceReadiness.serviceTime}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black font-display text-white leading-tight">
                    {data.serviceReadiness.progressPct}%
                  </div>
                  <div className="text-[11px] text-brand-200">
                    {data.serviceReadiness.completedTasks} of {data.serviceReadiness.totalTasks} Tasks Ready
                  </div>
                </div>
                <Link
                  to="/departments"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-brand-900 hover:bg-brand-50 transition shadow-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  Review Units <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Overall Service Progress Bar */}
            <div className="mt-4">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 via-emerald-400 to-emerald-300 rounded-full transition-all duration-700"
                  style={{ width: `${data.serviceReadiness.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Department Unit Readiness Grid */}
          {data.serviceReadiness.departments?.length > 0 && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span>Unit Breakdown ({data.serviceReadiness.departments.length} Departments Active)</span>
                <Link to="/departments" className="text-brand-600 hover:underline capitalize font-medium flex items-center gap-1">
                  Open All Checklists <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.serviceReadiness.departments.map((dept) => (
                  <Link
                    key={dept.id}
                    to="/departments"
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/20 transition group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-gray-900 group-hover:text-brand-700 truncate mr-2">
                        {dept.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        dept.pct === 100
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : dept.pct > 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {dept.pct === 100 ? 'Ready' : dept.pct > 0 ? `${dept.pct}%` : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                        <span>{dept.completed}/{dept.total} items</span>
                        <span>{dept.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            dept.pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                          }`}
                          style={{ width: `${dept.pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 card border border-brand-100/70 bg-gradient-to-r from-brand-50/50 via-white to-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
              <CheckSquare size={20} />
            </div>
            <div>
              <h4 className="font-display font-bold text-gray-900 text-sm">Sunday & Midweek Service Readiness</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Equip your department heads (Media, Sound, Choir, Ushers) with pre-service checklists and automated preparation reminders.
              </p>
            </div>
          </div>
          <Link
            to="/departments"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
          >
            Manage Readiness <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Members" color="brand" to="/members"
          value={fmt(data?.members?.total)}
          sub={`+${fmt(data?.members?.new_this_month)} this month`} subUp />
        <StatCard icon={UserPlus} label="First Timers" color="amber" to="/first-timers"
          value={fmt(data?.firstTimers?.total)}
          sub={`${fmt(data?.firstTimers?.pending_follow_up)} need follow-up`} />
        <StatCard icon={CalendarDays} label="Upcoming Events" color="purple" to="/events"
          value={fmt(data?.events?.upcoming)}
          sub={`Avg. ${Math.round(data?.events?.avg_attendance || 0)} attendance`} subUp />
        <StatCard icon={DollarSign} label="Monthly Income" color="green" to="/finance"
          value={currency(data?.finance?.month_income)}
          sub={`${currency(data?.finance?.month_expense)} expenses`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Finance trend */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title">Financial Overview</h3>
              <p className="text-xs text-gray-400">Last 12 months income vs expense</p>
            </div>
            <Link to="/finance" className="text-xs text-brand-600 flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b6ef6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b6ef6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currencyCode={user?.currency} />} />
                <Area type="monotone" dataKey="income" stroke="#3b6ef6" strokeWidth={2} fill="url(#income)" name="income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expense)" name="expense" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No financial data yet</div>
          )}
        </div>

        {/* Attendance trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title">Attendance</h3>
              <p className="text-xs text-gray-400">Last 8 services</p>
            </div>
            <Link to="/events" className="text-xs text-brand-600 flex items-center gap-1 hover:underline">
              View <ArrowRight size={12} />
            </Link>
          </div>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="attendance" fill="#3b6ef6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No attendance data yet</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Member breakdown */}
        <div className="card">
          <h3 className="section-title mb-4">Members Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Active Members', value: data?.members?.active, total: data?.members?.total, color: 'bg-brand-500' },
              { label: 'Male', value: data?.members?.male, total: data?.members?.total, color: 'bg-blue-400' },
              { label: 'Female', value: data?.members?.female, total: data?.members?.total, color: 'bg-pink-400' },
            ].map(({ label, value, total, color }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-900">{fmt(value)} <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/members" className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-4">
            Manage members <ArrowRight size={11} />
          </Link>
        </div>

        {/* First timer funnel */}
        <div className="card">
          <h3 className="section-title mb-4">First Timer Pipeline</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Total Visitors', value: data?.firstTimers?.total, color: 'bg-amber-100 text-amber-700' },
              { label: 'Pending Follow-up', value: data?.firstTimers?.pending_follow_up, color: 'bg-orange-100 text-orange-700' },
              { label: 'Converted to Members', value: data?.firstTimers?.converted, color: 'bg-emerald-100 text-emerald-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${color}`}>{fmt(value)}</span>
              </div>
            ))}
          </div>
          <Link to="/first-timers" className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-4">
            View first timers <ArrowRight size={11} />
          </Link>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="section-title mb-4">Recent Activity</h3>
          {data?.recentActivity?.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: activityColors[item.type] || '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{activityLabels[item.type]}: <span className="font-medium">{item.title}</span></p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {format(parseISO(item.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
