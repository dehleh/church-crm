import { useEffect, useState } from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';

const fmt = (n) => '₦' + Number(n || 0).toLocaleString();

export default function MemberPortalGiving() {
  const [data, setData] = useState({ items: [], totals: { total: 0, ytd: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalAPI.giving().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Giving</h1>
      <p className="text-gray-500 text-sm mb-6">A record of contributions linked to your membership.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase font-semibold">This year (YTD)</div>
          <div className="text-3xl font-bold text-gray-900 font-display mt-1">{fmt(data.totals?.ytd)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase font-semibold">Lifetime</div>
          <div className="text-3xl font-bold text-gray-900 font-display mt-1">{fmt(data.totals?.total)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : data.items.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No giving recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(t.transaction_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-gray-700">{t.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{t.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
