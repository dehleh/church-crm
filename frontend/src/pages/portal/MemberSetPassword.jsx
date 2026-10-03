import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader2, KeyRound, CheckCircle2, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAuthAPI } from '../../api/memberClient';

export default function MemberSetPassword() {
  const { churchSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [form, setForm] = useState({
    email: emailParam,
    memberNumber: '',
    token: tokenParam,
    password: '',
    confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [requestingLink, setRequestingLink] = useState(false);
  const [showRequestLinkForm, setShowRequestLinkForm] = useState(false);
  const [requestEmail, setRequestEmail] = useState(emailParam);

  useEffect(() => {
    if (tokenParam) setForm(f => ({ ...f, token: tokenParam }));
    if (emailParam) setForm(f => ({ ...f, email: emailParam }));
  }, [tokenParam, emailParam]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return toast.error('Email address is required');
    if (!form.token && !form.memberNumber.trim()) {
      return toast.error('Please enter your Member Number or use the link sent to your email');
    }
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const res = await memberAuthAPI.setPassword({
        churchSlug,
        email: form.email.trim(),
        token: form.token ? form.token.trim() : undefined,
        memberNumber: form.memberNumber ? form.memberNumber.trim() : undefined,
        password: form.password,
      });

      // Auto sign-in if token returned
      if (res.data?.data?.token) {
        localStorage.setItem('memberToken', res.data.data.token);
        localStorage.setItem('memberChurchSlug', churchSlug);
        toast.success('Password created! Welcome to your Member Portal.');
        navigate(`/portal/${churchSlug}/home`, { replace: true });
      } else {
        toast.success('Password set! You can sign in now.');
        navigate(`/portal/${churchSlug}/login`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!requestEmail.trim()) return toast.error('Please enter your registered email');
    setRequestingLink(true);
    try {
      await memberAuthAPI.forgotPassword({ churchSlug, email: requestEmail.trim() });
      toast.success('A password setup link has been sent to your email and phone.');
      setShowRequestLinkForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send setup link');
    } finally {
      setRequestingLink(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {tokenParam ? 'Create Portal Password' : 'Set Your Password'}
            </h1>
            <p className="text-xs text-gray-500">
              {tokenParam
                ? 'Your verification link is valid. Choose a password below.'
                : 'Activate your Church Mobile Portal access.'}
            </p>
          </div>
        </div>

        {tokenParam && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>Secure 1-Click Setup Link Verified. Enter your desired password.</span>
          </div>
        )}

        {!showRequestLinkForm ? (
          <form onSubmit={submit} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Registered Email</label>
              <input
                type="email"
                required
                readOnly={Boolean(tokenParam && emailParam)}
                className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none ${
                  tokenParam && emailParam ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
                }`}
                value={form.email}
                onChange={set('email')}
                placeholder="name@example.com"
              />
            </div>

            {!tokenParam && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Member Number</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestLinkForm(true);
                      setRequestEmail(form.email);
                    }}
                    className="text-[11px] text-brand-600 hover:underline"
                  >
                    Don't know it?
                  </button>
                </div>
                <input
                  required
                  placeholder="e.g. MBR-00001"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                  value={form.memberNumber}
                  onChange={set('memberNumber')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New Password (min 8 characters)</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {loading ? 'Activating account…' : 'Set Password & Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestLink} className="space-y-4 mt-6">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
              Don't have your Member Number handy? Enter your registered email address and we will immediately send you a secure 1-click password setup link.
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Your Registered Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={requestingLink}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {requestingLink ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {requestingLink ? 'Sending Link…' : 'Email Me Setup Link'}
            </button>
            <button
              type="button"
              onClick={() => setShowRequestLinkForm(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-800 text-center py-1"
            >
              ← Back to password setup
            </button>
          </form>
        )}

        <div className="border-t border-gray-100 mt-6 pt-4 text-center">
          <p className="text-xs text-gray-500">
            Already have your password?{' '}
            <Link to={`/portal/${churchSlug}/login`} className="text-brand-600 font-semibold hover:underline">
              Sign in to Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

