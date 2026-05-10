import { useEffect, useState } from 'react';
import { Loader2, ScrollText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { platformAPI } from '../api/services';

export default function PlatformAuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await platformAPI.auditLog({ limit: 100 });
      setItems(data.data || []);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText size={22} className="text-indigo-600" /> Audit Log
          </h1>
          <p className="text-sm text-slate-500">Recent platform-wide administrative actions.</p>
        </div>
        <button onClick={load} className="btn-outline gap-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No audit entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Actor</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Target</th>
                  <th className="text-left px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{it.created_at ? format(new Date(it.created_at), 'MMM d, p') : '—'}</td>
                    <td className="px-4 py-2 text-slate-900">{it.actor_name || it.actor_email || '—'}</td>
                    <td className="px-4 py-2"><span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{it.action}</span></td>
                    <td className="px-4 py-2 text-slate-700">{it.target_type ? `${it.target_type}${it.target_label ? `: ${it.target_label}` : ''}` : '—'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-md truncate">{it.details ? (typeof it.details === 'string' ? it.details : JSON.stringify(it.details)) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
