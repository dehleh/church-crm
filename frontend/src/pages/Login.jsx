import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Shield, KeyRound, ArrowLeft, Church, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, twoFactorAPI, publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';
import { validateForm, required, email } from '../utils/validation';
import { applyChurchTheme, getCachedChurchBranding } from '../utils/theme';
import { getAssetUrl } from '../api/client';

export default function Login() {
  const { churchSlug: paramSlug } = useParams();
  const [searchParams] = useSearchParams();
  const querySlug = searchParams.get('church') || '';
  const activeSlug = paramSlug || querySlug;

  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Church White-Label State
  const [churchMeta, setChurchMeta] = useState(() => getCachedChurchBranding());

  // 2FA Challenge State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  useEffect(() => {
    let active = true;
    if (activeSlug) {
      publicIntakeAPI.getContext(activeSlug)
        .then((res) => {
          if (!active) return;
          const church = res.data.data;
          setChurchMeta(church);
          applyChurchTheme(church.settings?.theme, {
            name: church.name,
            logoUrl: church.logo_url || church.logoUrl,
            bannerUrl: church.banner_url || church.bannerUrl,
            tagline: church.tagline,
            slug: church.slug,
          });
        })
        .catch(() => {
          // Keep cached if error
        });
    } else if (churchMeta?.theme) {
      applyChurchTheme(churchMeta.theme, churchMeta);
    }

    return () => { active = false; };
  }, [activeSlug]);

  const handleClearChurch = () => {
    try {
      localStorage.removeItem('churchos_cached_branding');
    } catch {}
    setChurchMeta(null);
    applyChurchTheme({}, {});
    if (paramSlug || querySlug) {
      navigate('/login', { replace: true });
    }
  };

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

      // Apply and cache church branding
      applyChurchTheme(user.theme, {
        name: user.churchName,
        logoUrl: user.churchLogoUrl,
        bannerUrl: user.churchBannerUrl,
        tagline: user.churchTagline,
        slug: user.churchSlug,
      });

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

      // Apply and cache church branding
      applyChurchTheme(user.theme, {
        name: user.churchName,
        logoUrl: user.churchLogoUrl,
        bannerUrl: user.churchBannerUrl,
        tagline: user.churchTagline,
        slug: user.churchSlug,
      });

      login(user, payload);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(user.isSuperAdmin ? '/platform' : '/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Invalid 2FA code or backup key');
    } finally {
      setLoading(false);
    }
  };

  const churchName = churchMeta?.name || 'ChurchOS';
  const churchLogo = churchMeta?.logo_url || churchMeta?.logoUrl;
  const churchBanner = churchMeta?.banner_url || churchMeta?.bannerUrl;
  const churchTagline = churchMeta?.tagline || 'Multi-Branch Church Operating System';
  const isCustomBranded = Boolean(churchMeta?.name && churchMeta?.name !== 'ChurchOS');

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      {/* Sanctuary Backdrop Cover Photo */}
      {churchBanner && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[1px] transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${getAssetUrl(churchBanner)})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-brand-950/40 to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Church / Platform Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-3.5 p-2 border border-white/20">
            {churchLogo ? (
              <img
                src={getAssetUrl(churchLogo)}
                alt={churchName}
                className="w-full h-full object-contain"
              />
            ) : (
              <img src="/logo.png" alt="ChurchOS" className="w-full h-full object-contain" />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-white drop-shadow-sm">{churchName}</h1>
          <p className="text-brand-200 text-xs mt-1 max-w-xs mx-auto drop-shadow-xs">{churchTagline}</p>
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">Sign in to your account</h2>
                {isCustomBranded && (
                  <button
                    type="button"
                    onClick={handleClearChurch}
                    title="Sign into a different church"
                    className="text-[11px] text-gray-400 hover:text-brand-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} /> Switch Church
                  </button>
                )}
              </div>
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

              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center gap-2 text-center text-xs text-gray-500">
                <div>
                  Don't have an account?{' '}
                  <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold">
                    Register your church
                  </Link>
                </div>
                {churchMeta?.slug && (
                  <Link
                    to={`/portal/${churchMeta.slug}/login`}
                    className="text-gray-400 hover:text-brand-600 text-[11px] transition-colors"
                  >
                    Looking for the Member Portal? Click here &rarr;
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-[11px] text-white/50">
          © {new Date().getFullYear()} {churchName} · Powered by ChurchOS
        </div>
      </div>
    </div>
  );
}
