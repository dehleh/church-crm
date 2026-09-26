import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Heart,
  Shield,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  Printer,
  Sparkles,
  Building,
  User,
  Mail,
  Phone,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { givingAPI } from '../api/services';
import toast from 'react-hot-toast';

const PRESET_AMOUNTS = [2000, 5000, 10000, 25000, 50000, 100000];

export default function PublicGiving() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const referenceParam = searchParams.get('reference');

  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('5000');
  const [customAmount, setCustomAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification state (if returned from payment gateway)
  const [verifying, setVerifying] = useState(Boolean(referenceParam));
  const [verifiedTx, setVerifiedTx] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // 1. If referenceParam is present, handle verification
  useEffect(() => {
    if (referenceParam) {
      setVerifying(true);
      givingAPI
        .verify(referenceParam, { mock: searchParams.get('mock') })
        .then((res) => {
          setVerifiedTx(res.data?.data?.transaction || res.data?.data);
          toast.success('Thank you! Your donation was successful.');
        })
        .catch((err) => {
          setVerifyError(err.response?.data?.message || 'Verification could not be completed.');
        })
        .finally(() => setVerifying(false));
    }
  }, [referenceParam, searchParams]);

  // 2. Fetch Church public giving information
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    givingAPI
      .getPublicInfo(slug)
      .then((res) => {
        const data = res.data?.data;
        setChurch(data?.church);
        setCategories(data?.categories || []);
        if (data?.categories?.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
        if (data?.church?.currency) {
          setCurrency(data.church.currency);
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Church giving portal not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSelectPreset = (val) => {
    setAmount(String(val));
    setCustomAmount('');
  };

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    setAmount(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount);
    if (!finalAmount || finalAmount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }
    if (!isAnonymous && !donorEmail) {
      toast.error('Please provide an email address for your official receipt');
      return;
    }

    setSubmitting(true);
    try {
      const res = await givingAPI.initialize({
        churchSlug: slug,
        categoryId: selectedCategory || null,
        amount: finalAmount,
        currency,
        donorName: isAnonymous ? 'Anonymous' : donorName,
        donorEmail: isAnonymous ? 'anonymous@giving.churchos' : donorEmail,
        donorPhone,
        isAnonymous,
        notes,
        callbackUrl: `${window.location.origin}/give/${slug}?status=verify`,
      });

      const { authorizationUrl, reference } = res.data?.data || {};

      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        toast.success(`Giving initiated (Ref: ${reference})`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize payment gateway');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Verification State
  if (referenceParam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {verifying ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">Verifying Transaction</h3>
              <p className="text-sm text-slate-400 mt-1">Contacting secure payment network, please wait...</p>
            </div>
          ) : verifiedTx ? (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 size={36} />
                </div>
                <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Payment Verified
                </span>
                <h2 className="text-2xl font-bold font-display text-white mt-2">Thank You for Your Giving!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Your seed into the Kingdom has been acknowledged and recorded.
                </p>
              </div>

              {/* Printable Receipt Card */}
              <div id="giving-receipt" className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 text-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400">Receipt No</span>
                  <span className="font-mono text-white font-semibold">{verifiedTx.receipt_number || 'REC-CONFIRMED'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Category</span>
                  <span className="text-white font-medium">{verifiedTx.category_name || 'General Offering'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Donor</span>
                  <span className="text-white">{verifiedTx.donor_name || 'Generous Giver'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Date</span>
                  <span className="text-slate-300">{new Date(verifiedTx.paid_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-sm font-semibold text-slate-200">Amount Given</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {verifiedTx.currency || 'NGN'} {Number(verifiedTx.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <Link
                  to={`/give/${slug || ''}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 text-center"
                >
                  Give Again
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">Payment Unverified</h3>
              <p className="text-sm text-slate-400 mt-2">{verifyError || 'We could not verify your donation.'}</p>
              <Link
                to={`/give/${slug || ''}`}
                className="inline-block mt-5 py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium"
              >
                Back to Giving Form
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          {church?.logoUrl ? (
            <img src={church.logoUrl} alt={church.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover shadow-lg border border-slate-800" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
              <Heart size={28} />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            {church?.name || 'Online Giving'}
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>Support the mission, ministries, and community welfare</span>
          </p>
        </div>

        {/* Giving Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Giving Category / Purpose
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Donation Amount
                </label>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Currency:</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GHS">GHS (₵)</option>
                    <option value="KES">KES (KSh)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      amount === String(val) && !customAmount
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {currency === 'NGN' ? '₦' : ''}{val.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  {currency}
                </span>
                <input
                  type="text"
                  placeholder="Or enter custom amount..."
                  value={customAmount}
                  onChange={handleCustomChange}
                  className="w-full pl-16 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-slate-400" />
                <span className="text-xs text-slate-300 font-medium">Give Anonymously</span>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-700 bg-slate-900 cursor-pointer"
              />
            </div>

            {/* Donor Fields (Hidden if Anonymous) */}
            {!isAnonymous && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. Brother David Adebayo"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email (for Instant Receipt)</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required={!isAnonymous}
                        placeholder="you@example.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone (WhatsApp Receipt)</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        placeholder="+234..."
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Note / Prayer Request */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prayer Request / Note (Optional)</label>
              <div className="relative">
                <MessageSquare size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <textarea
                  rows={2}
                  placeholder="Share a word with pastoral leadership or note for this seed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Connecting to Secure Gateway...</span>
                </>
              ) : (
                <>
                  <CreditCard size={17} />
                  <span>Give {currency} {Number(amount || 0).toLocaleString()} Now</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Lock size={12} className="text-emerald-400" /> 256-Bit SSL Bank Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building size={12} /> Direct Church Settlement
              </span>
            </div>
          </form>

          {/* Direct Bank Transfer option if available */}
          {church?.bankDetails && (
            <div className="mt-6 pt-5 border-t border-slate-850">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Or Give via Direct Bank Transfer
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p><strong>Bank:</strong> {church.bankDetails.bankName || 'Access Bank'}</p>
                <p><strong>Account Name:</strong> {church.bankDetails.accountName || church.name}</p>
                <p className="font-mono text-emerald-400 text-sm">
                  <strong>Account Number:</strong> {church.bankDetails.accountNumber}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 pt-6">
        ChurchOS Giving Engine · Secure Kingdom Contributions & Financial Stewardship
      </div>
    </div>
  );
}
