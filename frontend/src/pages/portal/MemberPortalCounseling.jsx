import { useEffect, useState } from 'react';
import { Loader2, MessageCircle, Plus, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';

const SESSION_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'marital', label: 'Marital' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'family', label: 'Family' },
  { value: 'grief', label: 'Grief' },
  { value: 'career', label: 'Career' },
  { value: 'other', label: 'Other' },
];

const STATUS_HUE = {
  pending: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function MemberPortalCounseling() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = () => memberPortalAPI.myCounseling().then(r => setItems(r.data.data));

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MessageCircle size={22} className="text-violet-600" /> Counseling</h1>
          <p className="text-gray-500 text-sm mt-1">Request a confidential session with a pastor or counselor.</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg shadow-sm">
          <Plus size={15} /> Request
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-12">
          <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">You haven't requested any counseling sessions yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(s => (
            <li key={s.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold text-gray-900 capitalize">{s.session_type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Submitted {format(new Date(s.created_at), 'MMM d, yyyy')}</div>
                </div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${STATUS_HUE[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status.replace(/_/g, ' ')}
                </span>
              </div>
              {s.scheduled_at && (
                <div className="text-xs text-gray-600 inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded mb-2">
                  <Calendar size={11} /> {format(new Date(s.scheduled_at), 'EEE, MMM d · p')}
                </div>
              )}
              {s.notes && <p className="text-sm text-gray-600 line-clamp-3">{s.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {open && <RequestModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function RequestModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ sessionType: 'general', notes: '', preferredDate: '' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.notes.trim()) return toast.error('Please describe what you need counsel about');
    setSaving(true);
    try {
      await memberPortalAPI.submitCounseling(form);
      toast.success('Counseling request submitted');
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
          <h2 className="font-bold text-gray-900">New counseling request</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select className={inputCls} value={form.sessionType} onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))}>
              {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred date & time (optional)</label>
            <input type="datetime-local" className={inputCls} value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">What would you like to talk about?</label>
            <textarea required rows={5} maxLength={2000} className={`${inputCls} resize-none`}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Share as much detail as you're comfortable with. Sessions are confidential." />
          </div>
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}
