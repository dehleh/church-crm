import { useEffect, useState } from 'react';
import { Cake, Sparkles, Calendar, Heart, Search, Loader2, PartyPopper } from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MemberPortalBirthdays() {
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'birthdays' | 'anniversaries'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    memberPortalAPI.birthdays()
      .then(res => {
        setBirthdays(res.data.birthdays || res.data.data || []);
        setAnniversaries(res.data.anniversaries || []);
      })
      .catch(() => toast.error('Failed to load celebrations'))
      .finally(() => setLoading(false));
  }, []);

  const bdayToday = birthdays.filter(b => b.is_today);
  const annivToday = anniversaries.filter(a => a.is_today);
  const allToday = [
    ...bdayToday.map(b => ({ ...b, type: 'birthday' })),
    ...annivToday.map(a => ({ ...a, type: 'anniversary' })),
  ];

  const upcomingBdays = birthdays.filter(b => !b.is_today).map(b => ({ ...b, type: 'birthday' }));
  const upcomingAnnivs = anniversaries.filter(a => !a.is_today).map(a => ({ ...a, type: 'anniversary' }));

  let combinedUpcoming = [];
  if (activeTab === 'birthdays') combinedUpcoming = upcomingBdays;
  else if (activeTab === 'anniversaries') combinedUpcoming = upcomingAnnivs;
  else combinedUpcoming = [...upcomingBdays, ...upcomingAnnivs].sort((a, b) => a.days_until - b.days_until);

  const filtered = combinedUpcoming.filter(person => {
    const full = `${person.first_name || ''} ${person.last_name || ''}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  const handleWish = (person) => {
    if (person.type === 'anniversary') {
      toast.success(`💍 Pastoral prayer & anniversary blessing sent for ${person.first_name} and family!`);
    } else {
      toast.success(`🎂 Prayer blessing sent for ${person.first_name}! May God bless their new age.`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 mb-2">
          <PartyPopper size={14} className="text-rose-500" />
          <span>Church Family Celebrations</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">
          Birthdays & Wedding Anniversaries
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Celebrate God’s faithfulness, birthdays, and marital milestones across our church family.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Today's Celebrants Highlight Banner */}
          {allToday.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 p-6 sm:p-8 text-white shadow-lg">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-rose-100 text-xs font-bold uppercase tracking-wider mb-2">
                  <PartyPopper size={16} />
                  <span>Celebrating Today!</span>
                  <span>·</span>
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 drop-shadow-sm">
                  Happy Celebrations to Our Church Family! 🎉✨
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allToday.map(c => (
                    <div key={`${c.type}-${c.id}`} className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {c.profile_photo_url ? (
                          <img src={c.profile_photo_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/70 shadow-sm" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-white/30 flex items-center justify-center font-bold text-sm text-white">
                            {getInitials(c.first_name, c.last_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate text-base">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-rose-100 flex items-center gap-1">
                            {c.type === 'anniversary' ? (
                              <>
                                <Heart size={12} className="fill-rose-200" /> Wedding Anniversary Today! 💍
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} /> Birthday Today! 🎂
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleWish(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-white text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-colors shadow-sm whitespace-nowrap"
                      >
                        {c.type === 'anniversary' ? 'Wish 💍' : 'Wish 🎈'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-3 text-sm text-gray-600 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <PartyPopper size={20} />
              </div>
              <div>
                <span className="font-semibold text-gray-900">No birthdays or anniversaries today.</span> Look ahead to upcoming celebrants below!
              </div>
            </div>
          )}

          {/* Navigation Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Celebrations ({upcomingBdays.length + upcomingAnnivs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('birthdays')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'birthdays'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <Cake size={13} />
                Birthdays ({upcomingBdays.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('anniversaries')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'anniversaries'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Heart size={13} />
                Anniversaries ({upcomingAnnivs.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search member name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
          </div>

          {/* Upcoming list grid */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              <Calendar size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-700">No upcoming celebrations found</p>
              <p className="text-xs text-gray-400 mt-1">Try switching tabs or clearing your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(person => {
                const isAnniv = person.type === 'anniversary';
                const monthIdx = isAnniv ? person.anniv_month : person.birth_month;
                const dayNum = isAnniv ? person.anniv_day : person.birth_day;
                const monthName = monthIdx ? MONTH_NAMES[monthIdx - 1] : '';

                return (
                  <div
                    key={`${person.type}-${person.id}`}
                    className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow ${
                      isAnniv ? 'border-amber-100/80 bg-gradient-to-br from-white to-amber-50/20' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {person.profile_photo_url ? (
                        <img src={person.profile_photo_url} alt="" className="w-11 h-11 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isAnniv ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'
                        }`}>
                          {getInitials(person.first_name, person.last_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-sm">
                          {person.first_name} {person.last_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          {isAnniv ? (
                            <span className="text-amber-800 flex items-center gap-1 font-medium">
                              💍 Anniversary · {monthName} {dayNum}
                            </span>
                          ) : (
                            <span>
                              🎂 Birthday · {monthName} {dayNum}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        isAnniv ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'
                      }`}>
                        {person.days_until === 1 ? 'Tomorrow' : `In ${person.days_until} days`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

