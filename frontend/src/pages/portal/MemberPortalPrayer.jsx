import { useEffect, useState } from 'react';
import { Loader2, HandHeart, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';

const STATUS_HUE = {
  open: 'bg-amber-50 text-amber-700',
  praying: 'bg-violet-50 text-violet-700',
  answered: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
};

const CATEGORIES = [
  { value: 'healing',   label: 'Healing' },
  { value: 'finances',  label: 'Finances' },
  { value: 'family',    label: 'Family' },
  { value: 'salvation', label: 'Salvation' },
  { value: 'others',    label: 'Other' },
];

export default function MemberPortalPrayer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = () => memberPortalAPI.listPrayers().then(r => setItems(r.data.data));

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><HandHeart size={22} className="text-rose-600" /> Prayer Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Share what's on your heart — your pastoral team will pray with you.</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm">
          <Plus size={15} /> New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-12">
          <HandHeart size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No prayer requests yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(p => (
            <li key={p.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs uppercase font-semibold text-gray-400 tracking-wide">{p.category || 'others'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{format(new Date(p.created_at), 'MMM d, yyyy')}</div>
                </div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${STATUS_HUE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{p.request}</p>
              {p.response_notes && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="text-xs uppercase font-semibold text-emerald-700">Pastor's response</div>
                  <p className="text-sm text-emerald-900 mt-1 whitespace-pre-line">{p.response_notes}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && <PrayerModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function PrayerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ request: '', category: 'others' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.request.trim()) return toast.error('Please share what we can pray for');
    setSaving(true);
    try {
      await memberPortalAPI.submitPrayer(form);
      toast.success('Prayer request submitted');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">New prayer request</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Your request</label>
            <textarea required rows={6} maxLength={2000} className={`${inputCls} resize-none`}
              value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))}
              placeholder="Share what's on your heart…" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <HandHeart size={14} />}
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
