import { useEffect, useState } from 'react';
import { Loader2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmt = (d) => d ? format(new Date(d), 'MMM yyyy') : '';

export default function MemberPortalGroups() {
  const [data, setData] = useState({ departments: [], groups: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.affiliations().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const Section = ({ title, items, hue, emptyLabel }) => (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Users size={15} /> {title}
      </h2>
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-10">
          <p className="text-sm text-gray-500">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map(it => (
            <div key={it.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{it.name}</div>
                  {it.category && <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{it.category}</div>}
                </div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${hue}`}>
                  {it.role || 'member'}
                </span>
              </div>
              {(it.description || it.purpose) && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{it.description || it.purpose}</p>}
              {it.meeting_schedule && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Calendar size={11} />{it.meeting_schedule}</p>}
              {it.joined_at && <p className="text-xs text-gray-400 mt-2">Joined {fmt(it.joined_at)}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Groups & Units</h1>
      <p className="text-gray-500 text-sm mb-6">Departments you serve in and groups you belong to.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          <Section title="Departments / Units" items={data.departments} hue="bg-violet-50 text-violet-700" emptyLabel="You haven't been assigned to a department yet." />
          <Section title="Groups" items={data.groups} hue="bg-sky-50 text-sky-700" emptyLabel="You haven't joined any group yet." />
        </>
      )}
    </div>
  );
}
