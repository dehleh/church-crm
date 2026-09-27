import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import {
  Loader2, Calendar, DollarSign, ArrowRight, Users, HandHeart, MessageCircle,
  Heart, MapPin, Video, Sparkles, BookOpen, GraduationCap, CheckCircle2, Cake,
  Megaphone, Film, Play, PartyPopper, Clock, Bell, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmtCurrency = (n) => '₦' + Number(n || 0).toLocaleString();

const QUICK = [
  { to: 'announcements', moduleKey: 'announcements', icon: Megaphone,    label: 'Notices',      hue: 'from-blue-600 to-indigo-600' },
  { to: 'media',         moduleKey: 'media',         icon: Film,         label: 'Media Library',hue: 'from-rose-600 to-pink-600' },
  { to: 'birthdays',     moduleKey: 'birthdays',     icon: Cake,         label: 'Celebrations', hue: 'from-amber-500 to-pink-500' },
  { to: 'devotionals',   moduleKey: 'devotionals',   icon: BookOpen,     label: 'Devotional',   hue: 'from-amber-500 to-orange-600' },
  { to: 'discipleship',  moduleKey: 'discipleship',  icon: GraduationCap,label: 'Discipleship', hue: 'from-purple-600 to-indigo-700' },
  { to: 'fellowship',    moduleKey: 'fellowship',    icon: Users,        label: 'Cell / Group', hue: 'from-teal-500 to-emerald-600' },
  { to: 'prayer',        moduleKey: 'prayer',        icon: HandHeart,    label: 'Prayer',       hue: 'from-rose-500 to-rose-600' },
  { to: 'giving',        moduleKey: 'giving',        icon: DollarSign,   label: 'Give Online',  hue: 'from-emerald-600 to-teal-700' },
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

  const churchSettings = church?.settings || me?.churchSettings || {};
  const portalSettings = churchSettings.portal || {};
  const themeSettings = churchSettings.theme || {};
  const primaryColor = themeSettings.primaryColor || '#1d4ed8';
  const enabledModules = portalSettings.enabledModules || {};
  const serviceSchedule = Array.isArray(churchSettings.serviceSchedule) ? churchSettings.serviceSchedule : [];
  const coreValues = Array.isArray(churchSettings.coreValues) ? churchSettings.coreValues : [];

  const visibleQuick = QUICK.filter(q => enabledModules[q.moduleKey] !== false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
      {/* Pinned Church Announcement Notice */}
      {portalSettings.bannerNoticeActive && portalSettings.bannerNoticeMessage && (
        <div className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
          portalSettings.bannerNoticeType === 'urgent'
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : portalSettings.bannerNoticeType === 'celebration'
            ? 'bg-purple-50/90 border-purple-200 text-purple-950'
            : 'bg-blue-50/90 border-blue-200 text-blue-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              portalSettings.bannerNoticeType === 'urgent'
                ? 'bg-rose-100 text-rose-700'
                : portalSettings.bannerNoticeType === 'celebration'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <Bell size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {portalSettings.bannerNoticeType === 'urgent'
                  ? 'Urgent Church Notice'
                  : portalSettings.bannerNoticeType === 'celebration'
                  ? 'Special Celebration'
                  : 'Important Notice'}
              </div>
              <p className="text-sm font-semibold mt-0.5 leading-snug">
                {portalSettings.bannerNoticeMessage}
              </p>
            </div>
          </div>
          {portalSettings.bannerNoticeLink && (
            <a
              href={portalSettings.bannerNoticeLink}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 shadow-xs text-xs font-bold text-gray-800 hover:bg-gray-50 transition inline-flex items-center gap-1.5"
            >
              Learn More <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Branded Church Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden text-white p-6 sm:p-8 shadow-lg border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #090d16 100%)`
        }}
      >
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
              <div className="text-white/80 text-xs uppercase tracking-wider font-semibold">
                {portalSettings.welcomeTitle || 'Welcome back'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold mt-0.5 drop-shadow-sm">{me.firstName} {me.lastName}</div>
              <div className="text-white/90 text-sm mt-0.5 font-medium flex items-center gap-2">
                <span>{church?.name || me.churchName}</span>
                {church?.tagline && <span className="text-white/60 italic hidden sm:inline">· {church.tagline}</span>}
              </div>
            </div>
          </div>
          {church?.logo_url && (
            <img src={church.logo_url} alt="" className="w-14 h-14 rounded-2xl bg-white/95 p-1 object-contain border border-white/40 shadow-sm hidden sm:block" />
          )}
        </div>

        {portalSettings.welcomeMessage && (
          <div className="relative z-10 mt-4 pt-3 border-t border-white/15 text-xs sm:text-sm text-white/90 italic font-normal max-w-3xl leading-relaxed">
            "{portalSettings.welcomeMessage}"
          </div>
        )}
      </div>

      {/* Quick actions */}
      {visibleQuick.length > 0 && (
        <div className={`grid gap-2 sm:gap-3 ${
          visibleQuick.length <= 4 ? 'grid-cols-4' : visibleQuick.length <= 6 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-8'
        }`}>
          {visibleQuick.map(({ to, icon: Icon, label, hue }) => (
            <Link key={to} to={`/portal/${churchSlug}/${to}`}
              className="bg-white border border-gray-100 rounded-xl p-2.5 sm:p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow text-center">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${hue} text-white flex items-center justify-center shadow-xs`}>
                <Icon size={17} />
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-tight">{label}</div>
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          {/* Today's Devotional Spotlight Card */}
          {enabledModules.devotionals !== false && (
            data?.todayDevotional ? (
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
            )
          )}

          {/* Latest Church Announcement */}
          {enabledModules.announcements !== false && data?.announcements?.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800 shadow-md">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-700/80 border border-blue-500/30 flex items-center justify-center text-blue-200 shrink-0">
                  <Megaphone size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-800/80 px-2 py-0.5 rounded">
                      Latest Notice
                    </span>
                    <span className="text-xs text-blue-200">
                      {format(new Date(data.announcements[0].created_at || Date.now()), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm sm:text-base mt-1 truncate">
                    {data.announcements[0].title}
                  </h4>
                  <p className="text-xs text-blue-200 line-clamp-1 mt-0.5">
                    {data.announcements[0].message}
                  </p>
                </div>
              </div>
              <Link
                to={`/portal/${churchSlug}/announcements`}
                className="shrink-0 px-4 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition shadow-sm"
              >
                View All Notices →
              </Link>
            </div>
          )}

          {/* Weekly Worship & Service Schedule */}
          {serviceSchedule.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Weekly Worship & Service Schedule</h3>
                    <p className="text-xs text-gray-400">Join our weekly gatherings and experience spiritual growth</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {serviceSchedule.map((svc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700">
                          {svc.day || 'Sunday'}
                        </span>
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" /> {svc.time || 'Worship'}
                        </span>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">{svc.name}</div>
                    </div>
                    {svc.venue && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 pt-1.5 border-t border-gray-200/60">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{svc.venue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Birthday Celebrants Spotlight */}
          {enabledModules.birthdays !== false && data?.upcomingBirthdays?.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-rose-500/10 border border-pink-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Cake size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                      Upcoming Birthday Celebrations <PartyPopper size={16} className="text-amber-500" />
                    </h3>
                    <p className="text-xs text-gray-500">Celebrate and speak blessings over our church family members</p>
                  </div>
                </div>
                <Link
                  to={`/portal/${churchSlug}/birthdays`}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {data.upcomingBirthdays.slice(0, 6).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-pink-100 shadow-xs"
                  >
                    {b.profile_photo_url ? (
                      <img src={b.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-pink-200" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center">
                        {(b.first_name?.[0] || '') + (b.last_name?.[0] || '')}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-gray-800">{b.first_name} {b.last_name}</div>
                      <div className="text-[10px] text-pink-600 font-semibold">{b.bday_formatted}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discipleship Training Spotlight if available */}
          {enabledModules.discipleship !== false && data?.activeCourses?.length > 0 && (
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
          {((enabledModules.giving !== false) || (enabledModules.events !== false) || (enabledModules.groups !== false) || (enabledModules.prayer !== false)) && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {enabledModules.giving !== false && (
                <Stat icon={DollarSign} label="Giving YTD" value={fmtCurrency(data?.givingYtd?.ytd)} hue="text-amber-600 bg-amber-50" />
              )}
              {enabledModules.events !== false && (
                <Stat icon={Calendar} label="Upcoming" value={data?.upcomingEvents?.length || 0} hue="text-sky-600 bg-sky-50" suffix="events" />
              )}
              {enabledModules.groups !== false && (
                <Stat icon={Users} label="My Groups" value={(data?.departments?.length || 0) + (data?.groups?.length || 0)} hue="text-violet-600 bg-violet-50" />
              )}
              {enabledModules.prayer !== false && (
                <Stat icon={HandHeart} label="Open Prayers" value={data?.openPrayers || 0} hue="text-rose-600 bg-rose-50" />
              )}
            </div>
          )}

          {/* Events and Groups Cards */}
          {((enabledModules.events !== false) || (enabledModules.groups !== false)) && (
            <div className={`grid gap-4 ${(enabledModules.events !== false && enabledModules.groups !== false) ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {enabledModules.events !== false && (
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
              )}

              {enabledModules.groups !== false && (
                <Card title="My Groups & Units" linkTo={`/portal/${churchSlug}/groups`}>
                  {(data?.departments?.length || data?.groups?.length) ? (
                    <div className="flex flex-wrap gap-2">
                      {data.departments?.map(d => (
                        <span key={d.id} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">
                          {d.name}{d.role && d.role !== 'member' ? ` · ${d.role}` : ''}
                        </span>
                      ))}
                      {data.groups?.map(g => (
                        <span key={g.id} className="px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full">
                          {g.name}{g.role && g.role !== 'member' ? ` · ${g.role}` : ''}
                        </span>
                      ))}
                    </div>
                  ) : <Empty label="You haven't joined any unit yet." />}
                </Card>
              )}
            </div>
          )}

          {/* Church Core Values Pillars */}
          {coreValues.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Our Pillars
              </span>
              {coreValues.map((val, idx) => (
                <span key={idx} className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                  {val}
                </span>
              ))}
            </div>
          )}

          {/* Recent Sermons & Media */}
          {enabledModules.media !== false && data?.recentMedia?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Film size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Sermons & Media</h3>
                    <p className="text-xs text-gray-400">Stream audio messages, sermon series, and church videos</p>
                  </div>
                </div>
                <Link
                  to={`/portal/${churchSlug}/media`}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  Media Library <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.recentMedia.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to={`/portal/${churchSlug}/media`}
                    className="group border border-gray-100 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition hover:shadow-xs flex flex-col"
                  >
                    <div className="aspect-video bg-slate-800 relative flex items-center justify-center overflow-hidden">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex items-center justify-center">
                          <Film size={28} className="text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-md group-hover:scale-110 transition">
                          <Play size={18} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {item.type || 'Sermon'}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-rose-600 transition">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {item.speaker || item.series || 'Church Ministry'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
