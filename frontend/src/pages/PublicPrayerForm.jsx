import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Church, HeartHandshake, Loader2, Send } from 'lucide-react';
import { publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';

export default function PublicPrayerForm() {
  const { churchSlug } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ requesterName: '', category: 'others', request: '', branchId: '', isAnonymous: false });

  useEffect(() => {
    let active = true;
    publicIntakeAPI.getContext(churchSlug)
      .then((res) => active && setMeta(res.data.data))
      .catch(() => active && toast.error('Unable to load church form'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [churchSlug]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const location = useMemo(() => meta?.church ? [meta.church.city, meta.church.state, meta.church.country].filter(Boolean).join(', ') : '', [meta]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.request.trim()) return toast.error('Prayer request is required');
    setSubmitting(true);
    try {
      await publicIntakeAPI.submitPrayerRequest(churchSlug, form);
      setSubmitted(true);
      toast.success('Prayer request submitted');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!meta?.church) return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-center text-gray-600">This prayer form is not available.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg mb-4">
            <HeartHandshake size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">Prayer Request Form</p>
          {location && <p className="text-sm text-gray-400 mt-1">{location}</p>}
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <h2 className="text-2xl font-display font-bold text-gray-900">Prayer received</h2>
              <p className="text-gray-600">Your request is now in the prayer page for follow-up and intercession.</p>
              <button onClick={() => { setSubmitted(false); setForm({ requesterName: '', category: 'others', request: '', branchId: '', isAnonymous: false }); }} className="btn-secondary">Submit another request</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Requester Name</label><input className="input" value={form.requesterName} onChange={set('requesterName')} disabled={form.isAnonymous} /></div>
              <div>
                <label className="label">Branch</label>
                <select className="input" value={form.branchId} onChange={set('branchId')}>
                  <option value="">Select branch</option>
                  {meta.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={set('category')}>
                  {['healing', 'finances', 'family', 'salvation', 'others'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div><label className="label">Prayer Request *</label><textarea className="input min-h-[140px]" value={form.request} onChange={set('request')} /></div>
              <label className="label flex items-center gap-2"><input type="checkbox" checked={form.isAnonymous} onChange={set('isAnonymous')} /> Keep this request anonymous</label>
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center inline-flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Prayer Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}