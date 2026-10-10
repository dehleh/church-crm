import { useEffect, useState } from 'react';
import {
  Loader2, DollarSign, HeartHandshake, Plus, CheckCircle2,
  Building, Calendar, Sparkles, CreditCard, Landmark, Copy, Check, X
} from 'lucide-react';
import { format } from 'date-fns';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

const fmt = (n) => '₦' + Number(n || 0).toLocaleString();

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

export default function MemberPortalGiving() {
  const [data, setData] = useState({ items: [], totals: { total: 0, ytd: 0 } });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [givingOptions, setGivingOptions] = useState(null);

  // Form State
  const [givingType, setGivingType] = useState('Offering');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [onlineGateway, setOnlineGateway] = useState('auto');
  const [selectedBankCurrency, setSelectedBankCurrency] = useState('ALL');
  const [transferRef, setTransferRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState('');
  const [generatingVA, setGeneratingVA] = useState(false);

  const fetchGivingData = () => {
    setLoading(true);
    Promise.all([
      memberPortalAPI.giving(),
      memberPortalAPI.givingOptions().catch(() => ({ data: { data: null } }))
    ])
      .then(([givRes, optRes]) => {
        setData(givRes.data.data || { items: [], totals: { total: 0, ytd: 0 } });
        const opts = optRes.data.data;
        setGivingOptions(opts);
        if (opts?.churchCurrency) setCurrency(opts.churchCurrency);
      })
      .catch(() => toast.error('Failed to load giving history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGivingData();
  }, []);

  const handleCopyAccount = (accNo, cur) => {
    navigator.clipboard.writeText(accNo);
    setCopiedAccount(accNo);
    toast.success(`Account number ${cur ? `(${cur}) ` : ''}copied to clipboard`);
    setTimeout(() => setCopiedAccount(''), 2500);
  };

  const handleGenerateMyVirtualAccount = async () => {
    setGeneratingVA(true);
    try {
      const res = await memberPortalAPI.generateVirtualAccount();
      setData(prev => ({ ...prev, virtualAccount: res.data.data }));
      toast.success('Your dedicated giving bank account has been generated!');
    } catch {
      toast.error('Failed to generate virtual bank account');
    } finally {
      setGeneratingVA(false);
    }
  };


  const handleGiveSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return toast.error('Please enter a valid amount');
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: numAmount,
        currency,
        purpose: givingType,
        categoryId: selectedCategory || undefined,
        campaignId: selectedCampaign || undefined,
        eventId: selectedEvent || undefined,
        paymentMethod: paymentMethod === 'transfer' ? 'transfer' : 'card',
        gateway: paymentMethod === 'transfer' ? undefined : (onlineGateway === 'auto' ? (currency !== 'NGN' ? 'flutterwave' : 'paystack') : onlineGateway),
        reference: paymentMethod === 'transfer' && transferRef ? transferRef : undefined,
        notes: givingType === 'Project' ? 'Church Project Contribution' : givingType === 'Event' ? 'Event / Program Support' : undefined,
      };

      const res = await memberPortalAPI.initiateGiving(payload);
      toast.success(res.data.message || 'Giving recorded successfully! God bless you.');
      setShowModal(false);
      setAmount('');
      setTransferRef('');
      fetchGivingData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete giving');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 mb-2">
            <DollarSign size={14} className="text-emerald-600" />
            <span>Online & Fellowship Giving</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">My Giving & Contributions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Give your tithes, offerings, project support, and program pledges directly.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <HeartHandshake size={18} />
          <span>Give Online Now</span>
        </button>
      </div>

      {/* Dedicated Virtual Bank Account Card (Direct Bank Transfer) */}
      <div className="p-6 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg font-display tracking-tight">Your Dedicated Church Bank Account</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  Instant Auto-Reconciled
                </span>
              </div>
              <p className="text-emerald-200/80 text-xs mt-0.5">
                Transfer directly from any mobile banking app or USSD — it instantly logs to your kingdom giving record
              </p>
            </div>
          </div>

          {data.virtualAccount ? (
            <button
              type="button"
              onClick={() => handleCopyAccount(data.virtualAccount.account_number)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {copiedAccount ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copiedAccount ? 'Copied!' : 'Copy Account'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerateMyVirtualAccount}
              disabled={generatingVA}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50 shadow-md transition-all"
            >
              {generatingVA ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
              <span>Generate My Account</span>
            </button>
          )}
        </div>

        {data.virtualAccount ? (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">Bank Name</span>
              <span className="text-base font-bold text-white mt-0.5 block">{data.virtualAccount.bank_name || 'Wema Bank'}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">Your Personal NUBAN</span>
                <span className="text-xl font-mono font-bold text-white mt-0.5 tracking-wider block">
                  {data.virtualAccount.account_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyAccount(data.virtualAccount.account_number)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 transition"
                title="Copy NUBAN"
              >
                {copiedAccount ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">Account Beneficiary</span>
              <span className="text-sm font-semibold text-white mt-0.5 block truncate">
                {data.virtualAccount.account_name}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-emerald-200/90 relative z-10 flex items-center justify-between">
            <span>Click "Generate My Account" to receive a personal bank account number dedicated to your kingdom giving.</span>
          </div>
        )}
      </div>

      {/* Church Multi-Currency Bank Accounts Directory */}
      {givingOptions?.bankAccounts?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Landmark size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Church Bank Transfer Details</h3>
                <p className="text-xs text-gray-500">Official church accounts for direct transfers in multiple currencies</p>
              </div>
            </div>

            {/* Currency switcher tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedBankCurrency('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  selectedBankCurrency === 'ALL'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Currencies
              </button>
              {Array.from(new Set(givingOptions.bankAccounts.map(b => b.currency || 'NGN'))).map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setSelectedBankCurrency(cur)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    selectedBankCurrency === cur
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {givingOptions.bankAccounts
              .filter(b => selectedBankCurrency === 'ALL' || (b.currency || 'NGN') === selectedBankCurrency)
              .map((b, idx) => (
                <div key={b.id || idx} className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200/60">
                        {b.currency || 'NGN'}
                      </span>
                      {b.isDefault && (
                        <span className="text-[9px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 text-sm truncate">{b.bank_name || b.bankName}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{b.account_name || b.accountName}</div>

                    <div className="mt-2.5 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-200/80">
                      <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm tracking-wide">
                        {b.account_number || b.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(b.account_number || b.accountNumber, b.currency)}
                        className="p-1 text-gray-400 hover:text-brand-600 rounded transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedAccount === (b.account_number || b.accountNumber) ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>

                    {(b.sort_code || b.sortCode || b.swift_code || b.swiftCode) && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 text-[10px] text-gray-500 font-mono space-y-0.5">
                        {(b.sort_code || b.sortCode) && <div>Sort/Routing: <span className="text-gray-700 font-bold">{b.sort_code || b.sortCode}</span></div>}
                        {(b.swift_code || b.swiftCode) && <div>SWIFT/BIC: <span className="text-gray-700 font-bold">{b.swift_code || b.swiftCode}</span></div>}
                      </div>
                    )}

                    {b.instructions && (
                      <p className="mt-1.5 text-[10px] text-gray-400 italic line-clamp-1">
                        {b.instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Metrics */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <div className="text-xs text-gray-500 uppercase font-semibold">This year (YTD)</div>
          <div className="text-3xl font-bold text-gray-900 font-display mt-1">{fmt(data.totals?.ytd)}</div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Contributions in {new Date().getFullYear()}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <div className="text-xs text-gray-500 uppercase font-semibold">Lifetime Total</div>
          <div className="text-3xl font-bold text-gray-900 font-display mt-1">{fmt(data.totals?.total)}</div>
          <p className="text-xs text-gray-400 mt-1">Lifetime recorded kingdom investments</p>
        </div>
      </div>

      {/* Church Projects & Campaigns */}
      {givingOptions?.campaigns?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Active Church Projects & Campaigns</h3>
                <p className="text-xs text-gray-400">Partner with our church vision by sowing into specific projects</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {givingOptions.campaigns.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-gray-100 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span className="capitalize font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {c.type}
                    </span>
                    <span>{c.progress_percent || 0}% funded</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mt-1 line-clamp-1">{c.title}</h4>
                  {c.scripture_text && (
                    <p className="text-[11px] text-emerald-800 italic mt-0.5 line-clamp-1">"{c.scripture_text}"</p>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${c.progress_percent || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{fmt(c.amount_raised)} raised</span>
                    <span>Goal: {c.target_amount > 0 ? fmt(c.target_amount) : 'Open'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGivingType('Project');
                      setSelectedCampaign(c.id);
                      if (c.category_id) setSelectedCategory(c.category_id);
                      setShowModal(true);
                    }}
                    className="w-full mt-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    Give to this Project →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-base">Contribution History</h3>
          <span className="text-xs text-gray-400 font-medium">{data.items.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No giving recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Give Online Now" above to make your first contribution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase font-semibold text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-right px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs">
                        {t.category || 'Offering'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize text-xs">{t.payment_method || 'Online'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Give Online Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Give to the Lord</h3>
                <p className="text-xs text-gray-500 mt-0.5">"Each of you should give what you have decided in your heart to give."</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGiveSubmit} className="space-y-4">
              {/* Purpose Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Giving Purpose</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Offering', 'Tithe', 'Project', 'Event', 'Welfare', 'Missions'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setGivingType(type)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        givingType === type
                          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Selector if Event chosen */}
              {givingType === 'Event' && givingOptions?.events?.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Event / Program</label>
                  <select
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500"
                    value={selectedEvent}
                    onChange={e => setSelectedEvent(e.target.value)}
                  >
                    <option value="">General Event Seed</option>
                    {givingOptions.events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project / Campaign Selector */}
              {givingOptions?.campaigns?.length > 0 && (givingType === 'Project' || selectedCampaign) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Project / Campaign</label>
                  <select
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500 font-medium"
                    value={selectedCampaign}
                    onChange={e => {
                      const cid = e.target.value;
                      setSelectedCampaign(cid);
                      const found = givingOptions.campaigns.find(c => c.id === cid);
                      if (found?.category_id) setSelectedCategory(found.category_id);
                    }}
                  >
                    <option value="">General Church Project Fund</option>
                    {givingOptions.campaigns.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.title} ({cp.progress_percent || 0}% funded)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount & Currency input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Amount & Currency</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Currency:</span>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-gray-800 outline-none focus:border-brand-500"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="CAD">CAD (CA$)</option>
                      <option value="KES">KES (KSh)</option>
                      <option value="GHS">GHS (GH₵)</option>
                      <option value="ZAR">ZAR (R)</option>
                      <option value="AUD">AUD (AU$)</option>
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                    {{ NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', AUD: 'AU$' }[currency] || currency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="Enter amount (e.g. 5000)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-bold text-lg text-gray-900 outline-none"
                  />
                </div>

                {/* Preset Amount Chips (for NGN) */}
                {currency === 'NGN' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_AMOUNTS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAmount(String(p))}
                        className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 font-medium transition-colors"
                      >
                        +{p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all ${
                      paymentMethod === 'card'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span>Card / Instant Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Landmark size={18} />
                    <span>Bank Transfer</span>
                  </button>
                </div>

                {/* Gateway Routing Details for Online Pay */}
                {paymentMethod === 'card' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-gray-600 flex items-center justify-between">
                    <div>
                      {currency !== 'NGN' ? (
                        <span>
                          <strong className="text-gray-800">Flutterwave:</strong> Supports {currency} and international card payments.
                        </span>
                      ) : (
                        <span>
                          <strong className="text-gray-800">Secure Gateway:</strong> Paystack & Flutterwave card/bank payment.
                        </span>
                      )}
                    </div>
                    {(givingOptions?.hasPaystack && givingOptions?.hasFlutterwave) && (
                      <select
                        value={onlineGateway}
                        onChange={e => setOnlineGateway(e.target.value)}
                        className="text-[11px] font-semibold bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700 outline-none"
                      >
                        <option value="auto">Auto-Select</option>
                        <option value="paystack">Paystack</option>
                        <option value="flutterwave">Flutterwave</option>
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Bank Details display if Transfer chosen */}
              {paymentMethod === 'transfer' && (
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center gap-1.5"><Landmark size={14} /> Church Bank Accounts</span>
                    {givingOptions?.bankAccounts?.length > 1 && (
                      <span className="text-[10px] text-amber-700 font-normal">
                        Showing accounts for {currency}
                      </span>
                    )}
                  </div>

                  {givingOptions?.bankAccounts?.length > 0 ? (
                    givingOptions.bankAccounts
                      .filter(b => (b.currency || 'NGN') === currency || givingOptions.bankAccounts.length === 1)
                      .concat(
                        givingOptions.bankAccounts.some(b => (b.currency || 'NGN') === currency)
                          ? []
                          : givingOptions.bankAccounts
                      )
                      .map((b, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-800">{b.bank_name || b.bankName}</span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-brand-50 text-brand-700">
                                {b.currency || 'NGN'}
                              </span>
                            </div>
                            <div className="text-gray-700 font-mono font-bold tracking-wider text-xs sm:text-sm mt-0.5">
                              {b.account_number || b.accountNumber}
                            </div>
                            <div className="text-[10px] text-gray-400">{b.account_name || b.accountName}</div>
                            {(b.sort_code || b.sortCode || b.swift_code || b.swiftCode) && (
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {b.sort_code || b.sortCode ? `Sort: ${b.sort_code || b.sortCode} ` : ''}
                                {b.swift_code || b.swiftCode ? `SWIFT: ${b.swift_code || b.swiftCode}` : ''}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(b.account_number || b.accountNumber, b.currency)}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
                            title="Copy account number"
                          >
                            {copiedAccount === (b.account_number || b.accountNumber) ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-gray-600">
                      Transfer directly to the church's designated account and paste your transfer session ID / reference below.
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mt-2 mb-1">
                      Bank Transfer Reference / Narration (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Session ID or Transfer note"
                      value={transferRef}
                      onChange={e => setTransferRef(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-sm mt-4"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <HeartHandshake size={18} />}
                <span>{submitting ? 'Recording Giving…' : `Give ${amount ? `${{ NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', AUD: 'AU$' }[currency] || currency}${amount}` : ''} for ${givingType}`}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
