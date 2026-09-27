import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Terminal, Server, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, twoFactorAPI } from '../api/services';
import toast from 'react-hot-toast';
import { validateForm, required, email } from '../utils/validation';

export default function PlatformLogin() {
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
        throw new Error('Invalid response received from server.');
      }
      if (!user.isSuperAdmin) {
        throw new Error('Access denied: This portal is strictly for Platform Development & Super Admin staff.');
      }
      login(user, payload);
      toast.success(`Welcome back to Platform Console, ${user.firstName}!`);
      navigate('/platform');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.';
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
      if (!user || !user.isSuperAdmin) {
        throw new Error('Access denied: Platform Super Admin privileges required.');
      }
      login(user, payload);
      toast.success(`Welcome back to Platform Console, ${user.firstName}!`);
      navigate('/platform');
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Invalid 2FA security code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            <Terminal size={20} />
          </div>
          <div>
            <div className="font-display font-bold text-white tracking-tight flex items-center gap-2 text-base">
              ChurchOS
              <span className="text-[10px] font-semibold tracking-widest uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Engineering Console
              </span>
            </div>
            <div className="text-xs text-slate-400">Development Company & Platform Management Portal</div>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-12">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {twoFactorChallenge ? (
            /* 2FA Challenge Screen */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
                  <Shield size={26} />
                </div>
                <h2 className="font-display text-2xl font-bold text-white">Platform 2FA Challenge</h2>
                <p className="text-slate-400 text-xs mt-1">
                  {isBackupCode
                    ? 'Enter an emergency 8-character recovery backup key.'
                    : 'Enter the 6-digit TOTP code from your registered Authenticator App.'}
                </p>
              </div>

              {serverError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 mb-5 text-red-200 text-sm">
                  <AlertCircle size={17} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {isBackupCode ? 'Platform Backup Key' : '6-Digit Authenticator Code'}
                  </label>
                  <div className="relative">
                    <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      autoFocus
                      maxLength={isBackupCode ? 10 : 6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={isBackupCode ? 'XXXX-XXXX' : '123456'}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
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
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {isBackupCode ? '← Use Authenticator App' : 'Use recovery backup key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorChallenge(null);
                      setTwoFactorCode('');
                      setServerError('');
                    }}
                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Server size={17} />}
                  <span>Verify & Enter Console</span>
                </button>
              </form>
            </div>
          ) : (
            /* Email + Password Form */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
                  <Shield size={26} />
                </div>
                <h2 className="font-display text-2xl font-bold text-white">Platform Administration</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Sign in with your Super Administrator account to monitor, support, and manage church tenants.
                </p>
              </div>

              {serverError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 mb-5 text-red-200 text-sm">
                  <AlertCircle size={17} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Developer / Admin Email
                  </label>
                  <input
                    type="email"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="superadmin@churchos.platform"
                    value={form.email}
                    onChange={e => {
                      setForm(f => ({ ...f, email: e.target.value }));
                      setErrors(e2 => ({ ...e2, email: undefined }));
                    }}
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Platform Security Key / Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={e => {
                        setForm(f => ({ ...f, password: e.target.value }));
                        setErrors(e2 => ({ ...e2, password: undefined }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live API & Database Connected
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Lock size={11} /> 256-Bit SSL
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Server size={17} />}
                  <span>Enter Platform Console</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 pt-4">
        ChurchOS Multi-Tenant Architecture · Built for Scalable Church SaaS Operations & Global Mission Support
      </div>
    </div>
  );
}
