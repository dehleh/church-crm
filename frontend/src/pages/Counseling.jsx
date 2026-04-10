import { useState, useEffect, useCallback } from 'react';
import { HandHeart, Plus, Clock, CheckCircle, XCircle, User, Search, Filter } from 'lucide-react';
import { counselingAPI, membersAPI } from '../api/services';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SESSION_TYPES = ['individual', 'couple', 'family', 'group', 'pre_marital', 'crisis'];
const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'];
const TYPE_LABELS = { individual: 'Individual', couple: 'Couple', family: 'Family', group: 'Group', pre_marital: 'Pre-Marital', crisis: 'Crisis' };
const STATUS_COLORS = { scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600', no_show: 'bg-red-100 text-red-700' };

export default function Counseling() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'view'
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [form, setForm] = useState({
    sessionType: 'individual', memberId: '', firstTimerId: '', counseleeName: '',
    scheduledDate: '', scheduledTime: '', notes: '', isConfidential: true
  });

  const fetchSessions = useCallback(async () => {
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await counselingAPI.list(params);
      setSessions(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load sessions'); }
  }, [page, statusFilter, typeFilter]);

  const fetchStats = async () => {
    try {
      const { data } = await counselingAPI.stats();
      setStats(data.data || {});
    } catch {}
  };

  const fetchMembers = async () => {
    try {
      const { data } = await membersAPI.list({ limit: 500 });
      setMembers(data.data || []);
    } catch {}
  };

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchStats(); fetchMembers(); }, []);

  const handleAdd = async () => {
    if (!form.scheduledDate) return toast.error('Date is required');
    try {
      const payload = {
        sessionType: form.sessionType,
        scheduledAt: `${form.scheduledDate}T${form.scheduledTime || '09:00'}`,
        notes: form.notes || undefined,
        isConfidential: form.isConfidential,
        requesterName: form.counseleeName || undefined,
        memberId: form.memberId || undefined,
      };
      await counselingAPI.create(payload);
      toast.success('Session booked');
      setModal(null);
      fetchSessions();
      fetchStats();
    } catch { toast.error('Failed to book session'); }
  };

  const handleStatusChange = async (session, status) => {
    try {
      await counselingAPI.update(session.id, { status });
      toast.success('Status updated');
      fetchSessions();
      fetchStats();
    } catch { toast.error('Failed to update'); }
  };

  const openAdd = () => {
    setForm({ sessionType: 'individual', memberId: '', firstTimerId: '', counseleeName: '', scheduledDate: '', scheduledTime: '', notes: '', isConfidential: true });
    setModal('add');
  };

  const openView = (s) => { setSelected(s); setModal('view'); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <HandHeart className="text-brand-600" size={28} /> Counseling Sessions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage pastoral counseling appointments</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={18} /> Book Session</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: stats.total || 0, color: 'text-brand-600' },
          { label: 'Scheduled', value: stats.scheduled || 0, color: 'text-blue-600' },
          { label: 'Completed', value: stats.completed || 0, color: 'text-green-600' },
          { label: 'Cancelled', value: stats.cancelled || 0, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-40">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input-field w-40">
          <option value="">All Types</option>
          {SESSION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Counselee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date/Time</th>
              <th className="px-4 py-3">Counselor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No counseling sessions found</td></tr>
              )}
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openView(s)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.requester_display_name || s.requester_name || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-brand-50 text-brand-700">{TYPE_LABELS[s.session_type] || s.session_type}</span></td>
                  <td className="px-4 py-3 text-gray-600">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.counselor_name || '—'}</td>
                  <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[s.status])}>{s.status?.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</span></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={s.status}
                      onChange={e => handleStatusChange(s, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Book Counseling Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type *</label>
                <select value={form.sessionType} onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))} className="input-field w-full">
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member (optional)</label>
                <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} className="input-field w-full">
                  <option value="">Select member or type name below</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Counselee Name</label>
                <input value={form.counseleeName} onChange={e => setForm(f => ({ ...f, counseleeName: e.target.value }))} className="input-field w-full" placeholder="If not a member" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field w-full" rows={3} placeholder="Session notes or reason..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isConfidential} onChange={e => setForm(f => ({ ...f, isConfidential: e.target.checked }))} className="rounded" />
                Mark as confidential
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleAdd} className="btn-primary">Book Session</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Session Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Counselee</span><span className="font-medium">{selected.requester_display_name || selected.requester_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{TYPE_LABELS[selected.session_type] || selected.session_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Counselor</span><span>{selected.counselor_name || 'Not assigned'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[selected.status])}>{selected.status?.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</span></div>
              {selected.is_confidential && <div className="text-xs text-orange-600 font-medium">🔒 Confidential</div>}
              {selected.notes && <div><span className="text-gray-500 block mb-1">Notes</span><p className="bg-gray-50 p-3 rounded-lg text-gray-700">{selected.notes}</p></div>}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
