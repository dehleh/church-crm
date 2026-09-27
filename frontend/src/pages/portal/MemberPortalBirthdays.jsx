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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    memberPortalAPI.birthdays()
      .then(res => setBirthdays(res.data.data || []))
      .catch(() => toast.error('Failed to load birthdays'))
      .finally(() => setLoading(false));
  }, []);

  const celebrantsToday = birthdays.filter(b => b.is_today);
  const upcoming = birthdays.filter(b => !b.is_today);

  const filtered = upcoming.filter(b => {
    const full = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  const handleWish = (person) => {
    toast.success(`🎂 Prayer blessing sent for ${person.first_name}! May God bless their new age.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 mb-2">
          <Cake size={14} className="text-rose-500" />
          <span>Church Family Celebrations</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">Birthdays & Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          Celebrate God’s grace and rejoice with brothers and sisters marking their special day.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Today's Celebrants Highlight Banner */}
          {celebrantsToday.length > 0 ? (
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
                  Happy Birthday to Our Celebrants! 🎂🎉
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {celebrantsToday.map(c => (
                    <div key={c.id} className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
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
                            <Sparkles size={12} /> Today!
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleWish(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-white text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-colors shadow-sm whitespace-nowrap"
                      >
                        Wish 🎈
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-3 text-sm text-gray-600 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Cake size={20} />
              </div>
              <div>
                <span className="font-semibold text-gray-900">No birthdays today.</span> Look ahead to upcoming celebrants below!
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" />
              <span>Upcoming Birthdays</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {filtered.length}
              </span>
            </h3>
            <div className="relative w-64 max-w-full">
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
              <Cake size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-700">No upcoming birthdays found</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing your search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(person => {
                const monthName = person.birth_month ? MONTH_NAMES[person.birth_month - 1] : '';
                return (
                  <div key={person.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 min-w-0">
                      {person.profile_photo_url ? (
                        <img src={person.profile_photo_url} alt="" className="w-11 h-11 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {getInitials(person.first_name, person.last_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-sm">
                          {person.first_name} {person.last_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {monthName} {person.birth_day}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 whitespace-nowrap">
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
