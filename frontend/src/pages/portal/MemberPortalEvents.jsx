import { useEffect, useState } from 'react';
import { Loader2, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

export default function MemberPortalEvents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.events().then(r => setItems(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
      <p className="text-gray-500 text-sm mb-6">Services, meetings and special programmes coming up.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl text-center py-16">
          <Calendar size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((ev) => (
            <div key={ev.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{ev.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Calendar size={12} />{format(new Date(ev.start_datetime), 'EEE, MMM d · p')}</span>
                    {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
                    {ev.event_type && <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] uppercase font-semibold">{ev.event_type.replace(/_/g, ' ')}</span>}
                  </div>
                  {ev.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{ev.description}</p>}
                </div>
                {ev.is_online && ev.online_link && (
                  <a href={ev.online_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 font-semibold hover:underline whitespace-nowrap">
                    Join online <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
