import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import { Loader2, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmtCurrency = (n) => '₦' + Number(n || 0).toLocaleString();

export default function MemberHome() {
  const { me } = useOutletContext();
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.home().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {me.firstName}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's a quick look at your activity at {me.churchName}.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
              <DollarSign size={14} /> Giving · This Year
            </div>
            <div className="text-3xl font-bold text-gray-900 font-display">{fmtCurrency(data?.givingYtd?.ytd)}</div>
            <div className="text-xs text-gray-500 mt-1">{data?.givingYtd?.count || 0} contributions recorded</div>
            <Link to={`/portal/${churchSlug}/giving`} className="inline-flex items-center gap-1 text-brand-600 text-sm font-semibold mt-3 hover:underline">
              View history <ArrowRight size={14} />
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
              <Calendar size={14} /> Upcoming Events
            </div>
            {data?.upcomingEvents?.length ? (
              <ul className="space-y-2">
                {data.upcomingEvents.map(ev => (
                  <li key={ev.id} className="text-sm">
                    <div className="font-semibold text-gray-900">{ev.title}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(ev.start_datetime), 'EEE, MMM d · p')}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No events scheduled yet.</p>
            )}
            <Link to={`/portal/${churchSlug}/events`} className="inline-flex items-center gap-1 text-brand-600 text-sm font-semibold mt-3 hover:underline">
              See all <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
