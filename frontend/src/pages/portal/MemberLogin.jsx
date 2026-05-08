import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAuthAPI } from '../../api/memberClient';

export default function MemberLogin() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email and password required');
    setLoading(true);
    try {
      const { data } = await memberAuthAPI.login({ ...form, churchSlug });
      localStorage.setItem('memberToken', data.data.token);
      localStorage.setItem('memberChurchSlug', churchSlug);
      navigate(`/portal/${churchSlug}/home`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold">⛪</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Member Portal</h1>
            <p className="text-xs text-gray-500">Sign in to access your church portal</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input type="email" autoComplete="email" required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
            <input type="password" autoComplete="current-password" required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              value={form.password} onChange={set('password')} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-gray-500 text-center mt-6">
          First time?{' '}
          <Link to={`/portal/${churchSlug}/set-password`} className="text-brand-600 font-semibold hover:underline">Set your password</Link>
        </p>
      </div>
    </div>
  );
}
