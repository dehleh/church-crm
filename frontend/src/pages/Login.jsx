import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Shield, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, twoFactorAPI } from '../api/services';
import toast from 'react-hot-toast';
import { validateForm, required, email } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // 2FA Challenge State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const { valid, errors: errs } = validateForm(form, {
      email: [required('Email'), email],
      password: [required('Password')],
    });
    setErrors(errs);
    if (!valid) return;

    setLoading(true);
    try {
      const res = await authAPI.login(form);

      // Handle 2FA Challenge
      if (res?.data?.requireTwoFactor) {
        setTwoFactorChallenge({ token: res.data.twoFactorToken });
        setLoading(false);
        return;
      }

      const payload = res?.data?.data || res?.data;
      const user = payload?.user;
      if (!user) {
        throw new Error('Login failed: Invalid response received from server.');
      }
      login(user, payload);
      if (payload.forcePasswordChange) {
        toast('Please change your temporary password', { icon: '🔑' });
        navigate('/settings', { state: { changePassword: true } });
      } else {
        toast.success(`Welcome back, ${user.firstName}!`);
        navigate(user.isSuperAdmin ? '/platform' : '/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials and try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setServerError('Please enter your verification code');
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const res = await twoFactorAPI.verifyLogin({
        twoFactorToken: twoFactorChallenge.token,
        code: twoFactorCode.trim(),
      });
      const payload = res?.data?.data || res?.data;
      const user = payload?.user;
      if (!user) throw new Error('2FA verification failed.');
      login(user, payload);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(user.isSuperAdmin ? '/platform' : '/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Invalid 2FA code or backup key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-xl mb-4 p-2">
            <img src="/logo.png" alt="ChurchOS" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">ChurchOS</h1>
          <p className="text-brand-300 text-sm mt-1">Multi-Branch Church Management Platform</p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl border-white/10 backdrop-blur-sm">
          {twoFactorChallenge ? (
            /* 2FA Challenge Form */
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto mb-3">
                  <Shield size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {isBackupCode
                    ? 'Enter one of your 8-character recovery backup codes.'
                    : 'Enter the 6-digit verification code from your authenticator app.'}
                </p>
              </div>

              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="label">
                    {isBackupCode ? 'Recovery Backup Key' : '6-Digit Security Code'}
                  </label>
                  <div className="relative">
                    <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      maxLength={isBackupCode ? 10 : 6}
                      placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      className="input pl-10 text-center font-mono text-lg tracking-widest uppercase"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupCode(!isBackupCode);
                      setTwoFactorCode('');
                      setServerError('');
                    }}
                    className="text-brand-600 hover:text-brand-700 font-medium"
                  >
                    {isBackupCode ? '← Use Authenticator App' : 'Use a backup code instead'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorChallenge(null);
                      setTwoFactorCode('');
                      setServerError('');
                    }}
                    className="text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  <span>Verify Security Code</span>
                </button>
              </form>
            </div>
          ) : (
            /* Standard Email + Password Form */
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
              <p className="text-gray-500 text-sm mb-6">Welcome back. Enter your credentials to continue.</p>

              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    autoComplete="email"
                    className={`input ${errors.email ? 'border-red-400' : ''}`}
                    placeholder="pastor@church.org"
                    value={form.email}
                    onChange={e => {
                      setForm(f => ({ ...f, email: e.target.value }));
                      setErrors(e2 => ({ ...e2, email: undefined }));
                    }}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => {
                        setForm(f => ({ ...f, password: e.target.value }));
                        setErrors(e2 => ({ ...e2, password: undefined }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>Sign In</span>
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2.5 text-center text-xs text-gray-400">
                <div>
                  Don't have an account?{' '}
                  <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                    Register your church
                  </Link>
                </div>
                <div className="pt-2 border-t border-gray-50 flex items-center justify-center gap-1.5">
                  <Shield size={12} className="text-indigo-500" />
                  <span className="text-gray-400">Platform Engineer / Super Admin?</span>
                  <Link
                    to="/platform/login"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    Console Login →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
