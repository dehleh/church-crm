import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, LogIn, Church, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAuthAPI } from '../../api/memberClient';
import { publicIntakeAPI } from '../../api/services';
import { applyChurchTheme } from '../../utils/theme';
import { getAssetUrl } from '../../api/client';

export default function MemberLogin() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [churchMeta, setChurchMeta] = useState(null);
  const [fetchingMeta, setFetchingMeta] = useState(true);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    let active = true;
    if (!churchSlug) return;
    publicIntakeAPI.getContext(churchSlug)
      .then((res) => {
        if (!active) return;
        const church = res.data.data;
        setChurchMeta(church);
        applyChurchTheme(church.settings?.theme, {
          name: church.name,
          logoUrl: church.logo_url || church.logoUrl,
          bannerUrl: church.banner_url || church.bannerUrl,
          tagline: church.tagline,
          portal: true,
        });
      })
      .catch(() => {
        // Fallback gracefully if church context fails
      })
      .finally(() => {
        if (active) setFetchingMeta(false);
      });

    return () => { active = false; };
  }, [churchSlug]);

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

  const churchName = churchMeta?.name || 'Member Portal';
  const churchLogo = churchMeta?.logo_url || churchMeta?.logoUrl;
  const churchBanner = churchMeta?.banner_url || churchMeta?.bannerUrl;
  const churchTagline = churchMeta?.tagline || 'Welcome to your church family portal';

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
        {/* Church Identity Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-3.5 p-2 border border-white/20">
            {churchLogo ? (
              <img
                src={getAssetUrl(churchLogo)}
                alt={churchName}
                className="w-full h-full object-contain"
              />
            ) : (
              <Church size={36} className="text-brand-600" />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-white drop-shadow-sm">{churchName}</h1>
          <p className="text-brand-200 text-xs mt-1 max-w-xs mx-auto drop-shadow-xs">{churchTagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-white/10 p-7 sm:p-8 backdrop-blur-sm">
          <div className="mb-5 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-brand-600">Member Portal</div>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Sign in to your account</h2>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Portal Online" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                value={form.email}
                onChange={set('email')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Password</label>
                <Link to={`/portal/${churchSlug}/set-password`} className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Signing in…' : 'Sign in to Portal'}
            </button>
          </form>

          <div className="pt-5 mt-5 border-t border-gray-100 flex flex-col items-center gap-2 text-xs text-gray-500 text-center">
            <p>
              First time on the portal?{' '}
              <Link to={`/portal/${churchSlug}/set-password`} className="text-brand-600 font-semibold hover:underline">
                Activate your account
              </Link>
            </p>
            <Link to={`/connect/${churchSlug}/first-timer`} className="text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1 mt-1">
              Visiting for the first time? Welcome form &rarr;
            </Link>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-white/60">
          © {new Date().getFullYear()} {churchName} · Secured by ChurchOS
        </div>
      </div>
    </div>
  );
}
