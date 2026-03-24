import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Plus, Search, Phone, Mail, ArrowRightCircle, Loader2, CheckCircle } from 'lucide-react';
import { firstTimersAPI, branchesAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const FOLLOW_UP_BADGE = {
  pending: 'badge-yellow', contacted: 'badge-blue',
  converted: 'badge-green', inactive: 'badge-gray',
};

export default function FirstTimers() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(search && { search }), ...(statusFilter && { followUpStatus: statusFilter }) };
      const [res, statsRes] = await Promise.all([firstTimersAPI.list(params), firstTimersAPI.stats()]);
      setItems(res.data.data);
      setPagination(res.data.pagination);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load first timers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(1); }, [fetch]);
  useEffect(() => { branchesAPI.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.firstName || !form.lastName) return toast.error('Name required');
    setSaving(true);
    try {
      await firstTimersAPI.create(form);
      toast.success('First timer recorded!');
      setModal(null); fetch(1);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleFollowUp = async () => {
    setSaving(true);
    try {
      await firstTimersAPI.updateFollowUp(selected.id, {
        followUpStatus: form.followUpStatus,
        followUpNotes: form.followUpNotes,
      });
      toast.success('Follow-up updated!');
      setModal(null); fetch(pagination.page);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this first timer to a full member?')) return;
    try {
      await firstTimersAPI.convert(id);
      toast.success('Converted to member! 🎉');
      fetch(pagination.page);
    } catch { toast.error('Conversion failed'); }
  };

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">First Timers</h1>
          <p className="text-gray-500 text-sm mt-1">Track and follow up on new visitors</p>
        </div>
        <button onClick={() => { setForm({ visitDate: format(new Date(), 'yyyy-MM-dd') }); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> Record Visitor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Visitors', value: stats.total, color: 'text-gray-700' },
          { label: 'Pending Follow-up', value: stats.pending, color: 'text-amber-600' },
          { label: 'Contacted', value: stats.contacted, color: 'text-brand-600' },
          { label: 'Converted', value: stats.converted, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search visitors…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No first timers recorded</p>
            <button onClick={() => { setForm({ visitDate: format(new Date(), 'yyyy-MM-dd') }); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Record Visitor</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visit Date</th>
                <th>Contact</th>
                <th>How They Heard</th>
                <th>Follow-up</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                        {getInitials(item.first_name, item.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{item.gender || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{item.visit_date ? format(new Date(item.visit_date), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      {item.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} />{item.phone}</span>}
                      {item.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} />{item.email}</span>}
                    </div>
                  </td>
                  <td className="text-sm text-gray-500 capitalize">{item.how_did_you_hear || '—'}</td>
                  <td>
                    <span className={`badge capitalize ${FOLLOW_UP_BADGE[item.follow_up_status] || 'badge-gray'}`}>
                      {item.follow_up_status}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">{item.assigned_to_name || 'Unassigned'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {!item.converted_to_member && (
                        <>
                          <button
                            onClick={() => { setSelected(item); setForm({ followUpStatus: item.follow_up_status, followUpNotes: item.follow_up_notes }); setModal('followup'); }}
                            className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title="Update Follow-up">
                            <ArrowRightCircle size={15} />
                          </button>
                          <button
                            onClick={() => handleConvert(item.id)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Convert to Member">
                            <CheckCircle size={15} />
                          </button>
                        </>
                      )}
                      {item.converted_to_member && <span className="badge badge-green text-xs">Converted</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {items.length} of {pagination.total} visitors</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Record First Timer"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleAdd} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Save'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name *</label><input className="input" value={form.firstName || ''} onChange={set('firstName')} /></div>
            <div><label className="label">Last Name *</label><input className="input" value={form.lastName || ''} onChange={set('lastName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone || ''} onChange={set('phone')} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={set('email')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender || ''} onChange={set('gender')}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div><label className="label">Visit Date</label><input type="date" className="input" value={form.visitDate || ''} onChange={set('visitDate')} /></div>
          </div>
          <div>
            <label className="label">How did they hear about us?</label>
            <select className="input" value={form.howDidYouHear || ''} onChange={set('howDidYouHear')}>
              <option value="">Select</option>
              {['social_media','friend','walk_in','online_service','flyer','event','others'].map(v => (
                <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="label">Prayer Request</label><textarea className="input min-h-[70px]" value={form.prayerRequest || ''} onChange={set('prayerRequest')} /></div>
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={modal === 'followup'} onClose={() => setModal(null)} title="Update Follow-up"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleFollowUp} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Update'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Follow-up Status</label>
            <select className="input" value={form.followUpStatus || ''} onChange={set('followUpStatus')}>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input min-h-[100px]" placeholder="Add notes about your follow-up interaction…" value={form.followUpNotes || ''} onChange={set('followUpNotes')} /></div>
        </div>
      </Modal>
    </div>
  );
}
