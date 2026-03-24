import { useState, useEffect, useCallback } from 'react';
import { HeartHandshake, Plus, Phone, MessageCircle, MapPin, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';
import api from '../api/client';

const STATUS_STYLES = {
  pending:     { badge: 'badge-yellow', icon: Clock },
  in_progress: { badge: 'badge-blue',   icon: Phone },
  completed:   { badge: 'badge-green',  icon: CheckCircle2 },
  failed:      { badge: 'badge-red',    icon: AlertCircle },
};

const TYPE_ICON = { call: Phone, visit: MapPin, whatsapp: MessageCircle, email: MessageCircle, sms: MessageCircle };

export default function FollowUps() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [viewFilter, setViewFilter] = useState('all'); // all | mine
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(statusFilter && { status: statusFilter }) };
      const endpoint = viewFilter === 'mine' ? '/follow-ups/mine' : '/follow-ups';
      const [res, statsRes] = await Promise.all([
        api.get(endpoint, { params }),
        api.get('/follow-ups/stats'),
      ]);
      const data = viewFilter === 'mine' ? res.data.data : res.data.data;
      setItems(Array.isArray(data) ? data : []);
      if (res.data.pagination) setPagination(res.data.pagination);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load follow-ups'); }
    finally { setLoading(false); }
  }, [statusFilter, viewFilter]);

  useEffect(() => { fetch(1); }, [fetch]);

  useEffect(() => {
    api.get('/members', { params: { limit: 200, status: 'active' } }).then(r => setMembers(r.data.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data.data)).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.memberId) return toast.error('Select a member');
    setSaving(true);
    try {
      await api.post('/follow-ups', form);
      toast.success('Follow-up scheduled!');
      setModal(null); fetch(1);
    } catch { toast.error('Failed to create'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await api.patch(`/follow-ups/${id}`, updates);
      toast.success('Updated!');
      fetch(pagination.page);
    } catch { toast.error('Failed to update'); }
  };

  const openComplete = (item) => {
    setSelected(item);
    setForm({ outcome: '', status: 'completed' });
    setModal('complete');
  };

  const submitComplete = async () => {
    setSaving(true);
    try {
      await api.patch(`/follow-ups/${selected.id}`, {
        status: 'completed',
        outcome: form.outcome,
        completedAt: new Date().toISOString(),
      });
      toast.success('Follow-up marked complete!');
      setModal(null); fetch(pagination.page);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="text-gray-500 text-sm mt-1">Pastoral care and member follow-up tracking</p>
        </div>
        <button onClick={() => { setForm({ followUpType: 'call', assignedTo: user?.id }); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> Schedule Follow-up
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total',       value: stats.total,       color: 'text-gray-700' },
          { label: 'Pending',     value: stats.pending,     color: 'text-amber-600' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-brand-600' },
          { label: 'Completed',   value: stats.completed,   color: 'text-emerald-600' },
          { label: 'Overdue',     value: stats.overdue,     color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{value || 0}</p>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {['all', 'mine'].map(v => (
              <button key={v} onClick={() => setViewFilter(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${viewFilter === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {v === 'mine' ? 'My Follow-ups' : 'All'}
              </button>
            ))}
          </div>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <HeartHandshake size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No follow-ups yet</p>
            <button onClick={() => { setForm({ followUpType: 'call', assignedTo: user?.id }); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Schedule</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>Person</th><th>Type</th><th>Status</th><th>Assigned To</th><th>Scheduled</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => {
                const TypeIcon = TYPE_ICON[item.follow_up_type] || Phone;
                const { badge } = STATUS_STYLES[item.status] || { badge: 'badge-gray' };
                const isOverdue = item.scheduled_at && isPast(parseISO(item.scheduled_at)) && item.status !== 'completed';
                return (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{item.person_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 capitalize">{item.person_type}</p>
                        {item.person_phone && <p className="text-xs text-gray-400">{item.person_phone}</p>}
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600 capitalize">
                        <TypeIcon size={13} className="text-gray-400" />
                        {item.follow_up_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={`badge capitalize ${badge}`}>{item.status?.replace('_', ' ')}</span>
                        {isOverdue && <span className="text-xs text-red-500 font-medium">⚠ Overdue</span>}
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">{item.assigned_to_name || 'Unassigned'}</td>
                    <td className="text-sm text-gray-500 whitespace-nowrap">
                      {item.scheduled_at ? format(parseISO(item.scheduled_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {item.status !== 'completed' && (
                          <>
                            <button onClick={() => handleUpdate(item.id, { status: 'in_progress' })}
                              disabled={item.status === 'in_progress'}
                              className="text-xs px-2 py-1 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors disabled:opacity-40">
                              Start
                            </button>
                            <button onClick={() => openComplete(item)}
                              className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              Done
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{pagination.total} follow-ups</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Schedule Follow-up"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Schedule'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Member *</label>
            <select className="input" value={form.memberId || ''} onChange={set('memberId')}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} — {m.member_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Follow-up Type</label>
              <select className="input" value={form.followUpType || 'call'} onChange={set('followUpType')}>
                <option value="call">📞 Phone Call</option>
                <option value="visit">🏠 Home Visit</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
              </select>
            </div>
            <div>
              <label className="label">Assigned To</label>
              <select className="input" value={form.assignedTo || ''} onChange={set('assignedTo')}>
                <option value="">Select user</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Scheduled Date</label>
            <input type="datetime-local" className="input" value={form.scheduledAt || ''} onChange={set('scheduledAt')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-[80px]" placeholder="Reason for follow-up or context…" value={form.notes || ''} onChange={set('notes')} />
          </div>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={modal === 'complete'} onClose={() => setModal(null)} title="Mark Follow-up Complete"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={submitComplete} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : '✓ Mark Complete'}</button></>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Following up with: <span className="font-semibold">{selected?.person_name}</span></p>
          <div>
            <label className="label">Outcome / Notes *</label>
            <textarea className="input min-h-[120px]" placeholder="Describe what happened during the follow-up…" value={form.outcome || ''} onChange={set('outcome')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
