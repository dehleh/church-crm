import { useState } from 'react';
import { Loader2, HandHeart } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';

export default function MemberPortalPrayer() {
  const [request, setRequest] = useState('');
  const [category, setCategory] = useState('others');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!request.trim()) return toast.error('Please share what we can pray for');
    setSubmitting(true);
    try {
      await memberPortalAPI.submitPrayer({ request, category });
      toast.success('Prayer request submitted. Thank you.');
      setRequest('');
      setCategory('others');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <HandHeart size={22} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Submit a prayer request</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Your church's pastoral team will pray with you and may follow up.</p>

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
            value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="healing">Healing</option>
            <option value="finances">Finances</option>
            <option value="family">Family</option>
            <option value="salvation">Salvation</option>
            <option value="others">Other</option>
          </select>
        </div>
        <textarea
          required
          maxLength={2000}
          rows={6}
          placeholder="Share what's on your heart…"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <HandHeart size={14} />}
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
