import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAuthAPI } from '../../api/memberClient';

export default function MemberSetPassword() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', memberNumber: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await memberAuthAPI.setPassword({
        churchSlug,
        email: form.email,
        memberNumber: form.memberNumber,
        password: form.password,
      });
      toast.success('Password set! You can sign in now.');
      navigate(`/portal/${churchSlug}/login`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center"><KeyRound size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Set your password</h1>
            <p className="text-xs text-gray-500">Use the email and member number registered with your church.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input type="email" required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Member Number</label>
            <input required placeholder="MBR-00001" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.memberNumber} onChange={set('memberNumber')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">New Password (min 8)</label>
            <input type="password" required minLength={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password</label>
            <input type="password" required minLength={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.confirm} onChange={set('confirm')} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {loading ? 'Saving…' : 'Set password'}
          </button>
        </form>
        <p className="text-xs text-gray-500 text-center mt-6">
          Already have a password?{' '}
          <Link to={`/portal/${churchSlug}/login`} className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
