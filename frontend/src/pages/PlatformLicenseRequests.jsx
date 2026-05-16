import { useEffect, useState } from 'react';
import { Mail, Phone, Globe, Loader2, RefreshCw, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { platformAPI } from '../api/services';
import Modal from '../components/ui/Modal';

const STATUS_OPTS = ['pending', 'contacted', 'approved', 'rejected'];

const STATUS_STYLE = {
  pending:   'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  approved:  'bg-emerald-100 text-emerald-800',
  rejected:  'bg-gray-200 text-gray-700',
};

const PLAN_LABEL = {
  starter:    'Starter (₦25k)',
  growth:     'Growth (₦60k)',
  enterprise: 'Enterprise',
};

export default function PlatformLicenseRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await platformAPI.listLicenseRequests(statusFilter ? { status: statusFilter } : {});
      setItems(data.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const openEdit = (r) => {
    setEditing(r);
    setEditForm({ status: r.status, notes: r.notes || '' });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await platformAPI.updateLicenseRequest(editing.id, editForm);
      toast.success('Updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">License Requests</h1>
          <p className="text-sm text-gray-500">Inbound licensing leads from the public site.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input py-1.5 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="btn-outline gap-2"><RefreshCw size={14}/> Refresh</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3">Church</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400"><Loader2 size={18} className="animate-spin inline"/></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No requests</td></tr>
              ) : items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.church_name}</div>
                    {r.country && <div className="text-xs text-gray-400 flex items-center gap-1"><Globe size={11}/> {r.country}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.contact_name}</div>
                    <a href={`mailto:${r.admin_email}`} className="text-xs text-brand-700 flex items-center gap-1"><Mail size={11}/> {r.admin_email}</a>
                    {r.phone && <a href={`tel:${r.phone}`} className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11}/> {r.phone}</a>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {PLAN_LABEL[r.plan] || r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.branches_estimate ? <div>{r.branches_estimate} branches</div> : null}
                    {r.members_estimate  ? <div>{r.members_estimate} members</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold capitalize ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-outline text-xs gap-1" onClick={() => openEdit(r)}>
                      <MessageSquare size={12}/> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing ? `Manage — ${editing.church_name}` : ''}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            {editing.message && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Their message</div>
                {editing.message}
              </div>
            )}
            <div>
              <label className="label">Status</label>
              <select className="input" value={editForm.status} onChange={e=>setEditForm(f=>({...f, status: e.target.value}))}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Internal notes</label>
              <textarea className="input" rows={3} value={editForm.notes}
                onChange={e=>setEditForm(f=>({...f, notes: e.target.value}))}
                placeholder="Call notes, decision rationale, etc." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button>
              <button type="submit" className="btn-primary gap-2" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin"/>}
                Save
              </button>
            </div>
            <p className="text-[11px] text-gray-400 pt-1">
              Tip: when approved, go to <strong>Churches</strong> and create the church account, then set their plan and expiry from the cog menu.
            </p>
          </form>
        )}
      </Modal>
    </div>
  );
}
