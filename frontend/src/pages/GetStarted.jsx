import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { licenseAPI } from '../api/services';

const PLANS = [
  { code: 'starter',    label: 'Starter',    price: '₦25,000 / month', desc: 'Single branch · up to 250 members' },
  { code: 'growth',     label: 'Growth',     price: '₦60,000 / month', desc: 'Up to 3 branches · up to 500 members' },
  { code: 'enterprise', label: 'Enterprise', price: 'Custom',           desc: '10+ branches or 5,000+ members' },
];

export default function GetStarted() {
  const [params] = useSearchParams();
  const initialPlan = PLANS.find(p => p.code === params.get('plan'))?.code || 'growth';

  const [form, setForm] = useState({
    plan: initialPlan,
    churchName: '',
    contactName: '',
    adminEmail: '',
    phone: '',
    country: 'Nigeria',
    branchesEstimate: '',
    membersEstimate: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        branchesEstimate: form.branchesEstimate ? parseInt(form.branchesEstimate, 10) : null,
        membersEstimate:  form.membersEstimate  ? parseInt(form.membersEstimate, 10)  : null,
      };
      const { data } = await licenseAPI.submitRequest(payload);
      setDone(data?.message || 'Request submitted.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-8 text-center">
          <div className="w-14 h-14 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Request received</h1>
          <p className="text-gray-600 mt-2">{done}</p>
          <p className="text-sm text-gray-500 mt-4">
            Want to test the product first? You can also start a <Link to="/register" className="text-brand-700 font-semibold underline">14-day free trial</Link>.
          </p>
          <Link to="/" className="btn-outline mt-6 inline-flex items-center gap-2">
            <ArrowLeft size={14}/> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14}/> Back to home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="TMM" className="w-12 h-12 object-contain"/>
            <div>
              <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">Get Started</div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Request your ChurchOS license</h1>
              <p className="text-sm text-gray-500">Tell us a bit about your church and we'll set you up within 1 business day.</p>
            </div>
          </div>

          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Just want to try it? You can <Link to="/register" className="font-semibold underline">start a free 14-day trial</Link> instead — no card required.
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Plan *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <label key={p.code} className={`p-3 rounded-lg border-2 cursor-pointer transition ${form.plan === p.code ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="plan" className="sr-only"
                      checked={form.plan === p.code}
                      onChange={() => setForm(f => ({...f, plan: p.code}))} />
                    <div className="text-sm font-semibold text-gray-900">{p.label}</div>
                    <div className="text-xs text-brand-700 font-semibold">{p.price}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{p.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Church name *</label>
                <input className="input" value={form.churchName} onChange={update('churchName')} required />
              </div>
              <div>
                <label className="label">Your name *</label>
                <input className="input" value={form.contactName} onChange={update('contactName')} required />
              </div>
              <div>
                <label className="label">Admin email *</label>
                <input type="email" className="input" value={form.adminEmail} onChange={update('adminEmail')} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={update('phone')} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={update('country')} />
              </div>
              <div>
                <label className="label">Number of branches</label>
                <input type="number" min="1" className="input" value={form.branchesEstimate} onChange={update('branchesEstimate')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Approximate member count</label>
                <input type="number" min="0" className="input" value={form.membersEstimate} onChange={update('membersEstimate')} />
              </div>
            </div>

            <div>
              <label className="label">Anything else we should know?</label>
              <textarea className="input" rows={3} value={form.message} onChange={update('message')}
                placeholder="Tell us about your church, what features matter most, preferred go-live date, etc." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link to="/" className="btn-outline">Cancel</Link>
              <button type="submit" className="btn-primary gap-2" disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin"/>}
                Submit request
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center pt-1">
              By submitting you agree to be contacted about your ChurchOS license. We don't share your details.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
