import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import { Loader2, Calendar, DollarSign, ArrowRight, Users, HandHeart, MessageCircle, Heart, MapPin, Video, Sparkles, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmtCurrency = (n) => '₦' + Number(n || 0).toLocaleString();

const QUICK = [
  { to: 'devotionals', icon: BookOpen,      label: 'Devotional', hue: 'from-amber-500 to-orange-600' },
  { to: 'discipleship', icon: GraduationCap, label: 'Discipleship', hue: 'from-blue-600 to-indigo-700' },
  { to: 'fellowship',   icon: Users,        label: 'Cell / Group', hue: 'from-teal-500 to-emerald-600' },
  { to: 'prayer',       icon: HandHeart,    label: 'Pray',         hue: 'from-rose-500 to-rose-600' },
  { to: 'counseling',   icon: MessageCircle, label: 'Counsel',      hue: 'from-violet-500 to-violet-600' },
  { to: 'giving',       icon: DollarSign,    label: 'Give',         hue: 'from-amber-500 to-amber-600' },
];

export default function MemberHome() {
  const { me } = useOutletContext();
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.home().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const church = data?.church;
  const pastors = Array.isArray(church?.pastors) ? church.pastors : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
      {/* Branded Church Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-950 text-white p-6 sm:p-8 shadow-lg border border-brand-600/30">
        {church?.banner_url && (
          <img
            src={church.banner_url}
            alt="Church Cover"
            className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[0.5px]"
          />
        )}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {me.profilePhotoUrl ? (
              <img src={me.profilePhotoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl border-2 border-white/40">
                {(me.firstName?.[0] || '') + (me.lastName?.[0] || '')}
              </div>
            )}
            <div>
              <div className="text-brand-200 text-xs uppercase tracking-wider font-semibold">Welcome back</div>
              <div className="text-2xl sm:text-3xl font-bold mt-0.5 drop-shadow-sm">{me.firstName} {me.lastName}</div>
              <div className="text-brand-100 text-sm mt-0.5 font-medium flex items-center gap-2">
                <span>{church?.name || me.churchName}</span>
                {church?.tagline && <span className="text-brand-300 italic hidden sm:inline">· {church.tagline}</span>}
              </div>
            </div>
          </div>
          {church?.logo_url && (
            <img src={church.logo_url} alt="" className="w-14 h-14 rounded-2xl bg-white/95 p-1 object-contain border border-white/40 shadow-sm hidden sm:block" />
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {QUICK.map(({ to, icon: Icon, label, hue }) => (
          <Link key={to} to={`/portal/${churchSlug}/${to}`}
            className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${hue} text-white flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <div className="text-xs font-semibold text-gray-700 leading-tight">{label}</div>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          {/* Today's Devotional Spotlight Card */}
          {data?.todayDevotional ? (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 text-amber-100 text-xs font-bold uppercase tracking-wider">
                    <BookOpen size={14} />
                    <span>Today's Daily Word</span>
                    <span>·</span>
                    <span>{format(new Date(), 'EEEE, MMMM d')}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-xs">
                    {data.todayDevotional.title}
                  </h3>
                  <div className="text-amber-100 text-xs sm:text-sm font-medium italic">
                    "{data.todayDevotional.scripture_reference}" — {data.todayDevotional.scripture_text ? `"${data.todayDevotional.scripture_text.slice(0, 110)}..."` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <Link
                    to={`/portal/${churchSlug}/devotionals`}
                    className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-white text-amber-900 font-bold text-xs hover:bg-amber-50 shadow-sm transition"
                  >
                    Read & Listen Now →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-amber-800 tracking-wider">Daily Devotional</div>
                  <div className="text-sm font-semibold text-slate-800">Start your day with Scripture, faith confessions, and prayers</div>
                </div>
              </div>
              <Link
                to={`/portal/${churchSlug}/devotionals`}
                className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition shrink-0"
              >
                Browse Devotionals
              </Link>
            </div>
          )}

          {/* Discipleship Training Spotlight if available */}
          {data?.activeCourses?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">Discipleship & Foundation Training</h3>
                </div>
                <Link
                  to={`/portal/${churchSlug}/discipleship`}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  View All Courses <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {data.activeCourses.slice(0, 2).map((crs) => {
                  const pct = Math.round(Number(crs.progress_percent || 0));
                  const isComplete = pct === 100 || crs.enrollment_status === 'completed';
                  return (
                    <div
                      key={crs.id}
                      className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/60 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {crs.level || 'Foundation'}
                          </span>
                          {isComplete ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : crs.enrollment_id ? (
                            <span className="text-[11px] font-semibold text-blue-600">
                              {pct}% finished
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">Not enrolled</span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-1">{crs.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{crs.description}</div>
                      </div>

                      <div className="pt-1">
                        {crs.enrollment_id && (
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                        <Link
                          to={`/portal/${churchSlug}/discipleship`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
                        >
                          {crs.enrollment_id ? 'Continue Learning' : 'Start Course'} →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Giving YTD" value={fmtCurrency(data?.givingYtd?.ytd)} hue="text-amber-600 bg-amber-50" />
            <Stat icon={Calendar} label="Upcoming" value={data?.upcomingEvents?.length || 0} hue="text-sky-600 bg-sky-50" suffix="events" />
            <Stat icon={Users} label="My Groups" value={(data?.departments?.length || 0) + (data?.groups?.length || 0)} hue="text-violet-600 bg-violet-50" />
            <Stat icon={HandHeart} label="Open Prayers" value={data?.openPrayers || 0} hue="text-rose-600 bg-rose-50" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Upcoming events with promotional flyers */}
            <Card title="Upcoming Events & Services" linkTo={`/portal/${churchSlug}/events`}>
              {data?.upcomingEvents?.length ? (
                <ul className="space-y-3">
                  {data.upcomingEvents.map(ev => (
                    <li key={ev.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                      {ev.banner_url ? (
                        <img src={ev.banner_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0 shadow-xs" />
                      ) : (
                        <DateBadge dt={ev.start_datetime} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">{ev.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{format(new Date(ev.start_datetime), 'EEE, MMM d · p')}</span>
                          {ev.is_online ? (
                            <span className="text-purple-600 font-medium inline-flex items-center gap-0.5">· <Video size={11} /> Online</span>
                          ) : ev.location ? (
                            <span className="inline-flex items-center gap-0.5">· <MapPin size={11} />{ev.location}</span>
                          ) : null}
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

          {/* Pastoral Leadership Showcase */}
          {pastors.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-brand-600" />
                  <h3 className="font-bold text-gray-900 text-base">Pastoral Leadership</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">Your spiritual shepherds</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pastors.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-xs flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                        {(p.name || 'P')[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-brand-600 font-medium truncate">{p.role}</div>
                      {p.bio && <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{p.bio}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
