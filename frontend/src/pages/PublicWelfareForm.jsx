import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Church, HandHeart, Loader2, Send } from 'lucide-react';
import { publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';

export default function PublicWelfareForm() {
  const { churchSlug } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ applicantName: '', packageId: '', reason: '', amountRequested: '' });

  useEffect(() => {
    let active = true;
    publicIntakeAPI.getContext(churchSlug)
      .then((res) => active && setMeta(res.data.data))
      .catch(() => active && toast.error('Unable to load church form'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [churchSlug]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const location = useMemo(() => meta?.church ? [meta.church.city, meta.church.state, meta.church.country].filter(Boolean).join(', ') : '', [meta]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.applicantName.trim() || !form.packageId || !form.reason.trim()) {
      return toast.error('Please complete the required fields');
    }

    setSubmitting(true);
    try {
      await publicIntakeAPI.submitWelfareApplication(churchSlug, {
        ...form,
        amountRequested: form.amountRequested ? parseFloat(form.amountRequested) : undefined,
      });
      setSubmitted(true);
      toast.success('Welfare application submitted');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!meta?.church) return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-center text-gray-600">This welfare form is not available.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg mb-4">
            <HandHeart size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">Welfare Application Form</p>
          {location && <p className="text-sm text-gray-400 mt-1">{location}</p>}
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <h2 className="text-2xl font-display font-bold text-gray-900">Application received</h2>
              <p className="text-gray-600">Your welfare request is now on the Welfare page for review by the church team.</p>
              <button onClick={() => { setSubmitted(false); setForm({ applicantName: '', packageId: '', reason: '', amountRequested: '' }); }} className="btn-secondary">Submit another application</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Applicant Name *</label>
                <input className="input" value={form.applicantName} onChange={set('applicantName')} placeholder="Your full name" />
              </div>
              <div>
                <label className="label">Welfare Package *</label>
                <select className="input" value={form.packageId} onChange={set('packageId')}>
                  <option value="">Select package</option>
                  {(meta.welfarePackages || []).map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.package_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea className="input min-h-[130px]" value={form.reason} onChange={set('reason')} placeholder="Describe the support needed" />
              </div>
              <div>
                <label className="label">Amount Requested</label>
                <input type="number" min="0" step="0.01" className="input" value={form.amountRequested} onChange={set('amountRequested')} placeholder="0.00" />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center inline-flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Welfare Application
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
