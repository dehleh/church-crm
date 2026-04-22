import { useState, useEffect, useCallback, useMemo } from 'react';
import { HeartHandshake, Plus, Search, Loader2, MessageSquare, QrCode } from 'lucide-react';
import { prayerAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = { open: 'badge-yellow', praying: 'badge-blue', answered: 'badge-green', closed: 'badge-gray' };
const CATEGORY_BADGE = { healing: 'badge-red', finances: 'badge-yellow', family: 'badge-peach', salvation: 'badge-purple', others: 'badge-gray' };

export default function Prayer() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const churchSlug = user?.church_slug || user?.churchSlug;
  const publicPrayerFormUrl = useMemo(() => {
    if (!churchSlug || typeof window === 'undefined') return '';
    return `${window.location.origin}/connect/${churchSlug}/prayer`;
  }, [churchSlug]);

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(statusFilter && { status: statusFilter }) };
      const res = await prayerAPI.list(params);
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load prayer requests'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(1); }, [fetch]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.request) return toast.error('Prayer request text required');
    setSaving(true);
    try {
      await prayerAPI.create(form);
      toast.success('Prayer request submitted!');
      setModal(null); fetch(1);
    } catch { toast.error('Failed to submit'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id, status) => {
    try {
      await prayerAPI.update(id, { status });
      toast.success('Updated!');
      fetch(pagination.page);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Prayer Requests</h1><p className="text-gray-500 text-sm mt-1">Intercede for your congregation</p></div>
        <div className="flex gap-2">
          {publicPrayerFormUrl && <button onClick={() => setShowShare(true)} className="btn-secondary"><QrCode size={16} /> Prayer Form</button>}
          <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary"><Plus size={16} /> Add Request</button>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="praying">Praying</option>
            <option value="answered">Answered</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <HeartHandshake size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No prayer requests</p>
            <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Add Request</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>Requester</th><th>Request</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <p className="font-medium text-gray-900">
                      {item.is_anonymous ? 'Anonymous' : item.requester_name || (item.member_id ? 'Member' : 'Visitor')}
                    </p>
                  </td>
                  <td className="max-w-xs">
                    <p className="text-sm text-gray-700 line-clamp-2">{item.request}</p>
                  </td>
                  <td><span className={`badge capitalize ${CATEGORY_BADGE[item.category] || 'badge-gray'}`}>{item.category || 'others'}</span></td>
                  <td>
                    <select
                      className="input h-8 text-xs py-1 w-auto pr-6"
                      value={item.status}
                      onChange={e => handleUpdate(item.id, e.target.value)}
                    >
                      {['open','praying','answered','closed'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </td>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{format(new Date(item.created_at), 'MMM d, yyyy')}</td>
                  <td>
                    <button className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title="Add response note">
                      <MessageSquare size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{pagination.total} requests</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Prayer Request"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Submit'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Requester Name</label><input className="input" placeholder="Leave blank for anonymous" value={form.requesterName || ''} onChange={set('requesterName')} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category || ''} onChange={set('category')}>
              <option value="">Select category</option>
              {['healing','finances','family','salvation','others'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div><label className="label">Prayer Request *</label><textarea className="input min-h-[120px]" placeholder="Write the prayer request…" value={form.request || ''} onChange={set('request')} /></div>
          <div>
            <label className="label flex items-center gap-2">
              <input type="checkbox" checked={form.isAnonymous || false} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
              Keep anonymous
            </label>
          </div>
        </div>
      </Modal>

      <PublicIntakeShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="Prayer Request Form"
        description="Share this QR code or link so people can submit prayer requests directly into the Prayer Requests page."
        url={publicPrayerFormUrl}
      />
    </div>
  );
}
