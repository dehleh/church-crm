import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import { Loader2, Calendar, DollarSign, ArrowRight, Users, HandHeart, MessageCircle, Heart, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmtCurrency = (n) => '₦' + Number(n || 0).toLocaleString();

const QUICK = [
  { to: 'prayer',     icon: HandHeart,     label: 'Pray',       hue: 'from-rose-500 to-rose-600' },
  { to: 'counseling', icon: MessageCircle, label: 'Counsel',    hue: 'from-violet-500 to-violet-600' },
  { to: 'welfare',    icon: Heart,         label: 'Welfare',    hue: 'from-emerald-500 to-emerald-600' },
  { to: 'giving',     icon: DollarSign,    label: 'Give',       hue: 'from-amber-500 to-amber-600' },
];

export default function MemberHome() {
  const { me } = useOutletContext();
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.home().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 rounded-2xl text-white p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-4">
          {me.profilePhotoUrl ? (
            <img src={me.profilePhotoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur flex items-center justify-center font-bold text-xl">
              {(me.firstName?.[0] || '') + (me.lastName?.[0] || '')}
            </div>
          )}
          <div>
            <div className="text-brand-200 text-xs uppercase tracking-wide font-semibold">Welcome back</div>
            <div className="text-2xl sm:text-3xl font-bold mt-0.5">{me.firstName} {me.lastName}</div>
            <div className="text-brand-100 text-sm mt-0.5">{me.churchName}</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4">
        {QUICK.map(({ to, icon: Icon, label, hue }) => (
          <Link key={to} to={`/portal/${churchSlug}/${to}`}
            className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${hue} text-white flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <div className="text-xs font-semibold text-gray-700">{label}</div>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <Stat icon={DollarSign} label="Giving YTD" value={fmtCurrency(data?.givingYtd?.ytd)} hue="text-amber-600 bg-amber-50" />
            <Stat icon={Calendar} label="Upcoming" value={data?.upcomingEvents?.length || 0} hue="text-sky-600 bg-sky-50" suffix="events" />
            <Stat icon={Users} label="My Groups" value={(data?.departments?.length || 0) + (data?.groups?.length || 0)} hue="text-violet-600 bg-violet-50" />
            <Stat icon={HandHeart} label="Open Prayers" value={data?.openPrayers || 0} hue="text-rose-600 bg-rose-50" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            {/* Upcoming events */}
            <Card title="Upcoming Events" linkTo={`/portal/${churchSlug}/events`}>
              {data?.upcomingEvents?.length ? (
                <ul className="space-y-3">
                  {data.upcomingEvents.map(ev => (
                    <li key={ev.id} className="flex gap-3">
                      <DateBadge dt={ev.start_datetime} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">{ev.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          {format(new Date(ev.start_datetime), 'p')}
                          {ev.location && <><span className="mx-1">·</span><MapPin size={11} />{ev.location}</>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <Empty label="No events scheduled yet." />}
            </Card>

            {/* Departments + groups */}
            <Card title="My Groups & Units" linkTo={`/portal/${churchSlug}/groups`}>
              {(data?.departments?.length || data?.groups?.length) ? (
                <div className="flex flex-wrap gap-2">
                  {data.departments.map(d => (
                    <span key={d.id} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">
                      {d.name}{d.role && d.role !== 'member' ? ` · ${d.role}` : ''}
                    </span>
                  ))}
                  {data.groups.map(g => (
                    <span key={g.id} className="px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full">
                      {g.name}{g.role && g.role !== 'member' ? ` · ${g.role}` : ''}
                    </span>
                  ))}
                </div>
              ) : <Empty label="You haven't joined any unit yet." />}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hue, suffix }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hue}`}><Icon size={16} /></div>
      <div className="text-2xl font-bold text-gray-900 font-display mt-3 leading-none">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}{suffix ? ` · ${suffix}` : ''}</div>
    </div>
  );
}

function Card({ title, linkTo, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-gray-900">{title}</div>
        {linkTo && (
          <Link to={linkTo} className="text-brand-600 text-xs font-semibold inline-flex items-center gap-1 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ label }) { return <p className="text-sm text-gray-500">{label}</p>; }

function DateBadge({ dt }) {
  const d = new Date(dt);
  return (
    <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center justify-center flex-shrink-0">
      <div className="text-[10px] uppercase font-semibold text-brand-600 leading-none">{format(d, 'MMM')}</div>
      <div className="text-base font-bold text-gray-900 leading-none mt-0.5">{format(d, 'd')}</div>
    </div>
  );
}
