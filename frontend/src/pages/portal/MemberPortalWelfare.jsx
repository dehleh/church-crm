import { useEffect, useState } from 'react';
import { Loader2, Heart, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';

const fmt = (n) => n != null ? '₦' + Number(n).toLocaleString() : '—';

const STATUS_HUE = {
  pending: 'bg-amber-50 text-amber-700',
  under_review: 'bg-sky-50 text-sky-700',
  approved: 'bg-emerald-50 text-emerald-700',
  disbursed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const TYPE_HUE = {
  financial: 'bg-amber-100 text-amber-800',
  food: 'bg-emerald-100 text-emerald-800',
  medical: 'bg-rose-100 text-rose-800',
  educational: 'bg-sky-100 text-sky-800',
  housing: 'bg-violet-100 text-violet-800',
  other: 'bg-gray-100 text-gray-700',
};

export default function MemberPortalWelfare() {
  const [packages, setPackages] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = () => Promise.all([
    memberPortalAPI.welfarePackages().then(r => setPackages(r.data.data)),
    memberPortalAPI.myWelfareApplications().then(r => setItems(r.data.data)),
  ]);

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Heart size={22} className="text-emerald-600" /> Welfare</h1>
          <p className="text-gray-500 text-sm mt-1">Apply for assistance from a welfare package and track your requests.</p>
        </div>
        <button onClick={() => setOpen(true)} disabled={packages.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm">
          <Plus size={15} /> Apply
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <>
          {packages.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Available Packages</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {packages.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${TYPE_HUE[p.package_type] || TYPE_HUE.other}`}>
                        {p.package_type}
                      </span>
                    </div>
                    {p.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{p.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">My Applications</h2>
            {items.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl text-center py-12">
                <Heart size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No applications yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map(a => (
                  <li key={a.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{a.package_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Submitted {format(new Date(a.created_at), 'MMM d, yyyy')}</div>
                      </div>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${STATUS_HUE[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {(a.amount_requested != null || a.amount_approved != null) && (
                      <div className="flex gap-4 text-xs mb-2">
                        <div><span className="text-gray-500">Requested:</span> <span className="font-semibold text-gray-900">{fmt(a.amount_requested)}</span></div>
                        {a.amount_approved != null && (
                          <div><span className="text-gray-500">Approved:</span> <span className="font-semibold text-emerald-600">{fmt(a.amount_approved)}</span></div>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-3">{a.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {open && <ApplyModal packages={packages} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function ApplyModal({ packages, onClose, onSaved }) {
  const [form, setForm] = useState({ packageId: packages[0]?.id || '', reason: '', amountRequested: '' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.packageId) return toast.error('Pick a package');
    if (!form.reason.trim()) return toast.error('Please tell us your reason');
    setSaving(true);
    try {
      await memberPortalAPI.submitWelfare({
        packageId: form.packageId,
        reason: form.reason,
        amountRequested: form.amountRequested ? Number(form.amountRequested) : null,
      });
      toast.success('Welfare request submitted');
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
          <h2 className="font-bold text-gray-900">Apply for welfare</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Package</label>
            <select required className={inputCls} value={form.packageId} onChange={e => setForm(f => ({ ...f, packageId: e.target.value }))}>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.package_type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Amount needed (optional)</label>
            <input type="number" min={0} step="0.01" className={inputCls}
              value={form.amountRequested} onChange={e => setForm(f => ({ ...f, amountRequested: e.target.value }))}
              placeholder="₦0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for request</label>
            <textarea required rows={5} maxLength={2000} className={`${inputCls} resize-none`}
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Briefly explain your situation…" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
