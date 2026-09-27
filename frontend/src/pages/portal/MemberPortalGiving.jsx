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
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [transferRef, setTransferRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const fetchGivingData = () => {
    setLoading(true);
    Promise.all([
      memberPortalAPI.giving(),
      memberPortalAPI.givingOptions().catch(() => ({ data: { data: null } }))
    ])
      .then(([givRes, optRes]) => {
        setData(givRes.data.data || { items: [], totals: { total: 0, ytd: 0 } });
        setGivingOptions(optRes.data.data);
      })
      .catch(() => toast.error('Failed to load giving history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGivingData();
  }, []);

  const handleCopyAccount = (accNo) => {
    navigator.clipboard.writeText(accNo);
    setCopiedAccount(true);
    toast.success('Account number copied to clipboard');
    setTimeout(() => setCopiedAccount(false), 2500);
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
        purpose: givingType,
        categoryId: selectedCategory || undefined,
        eventId: selectedEvent || undefined,
        paymentMethod: paymentMethod === 'transfer' ? 'transfer' : 'card',
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

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (NGN)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    placeholder="Enter amount (e.g. 5000)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-bold text-lg text-gray-900 outline-none"
                  />
                </div>

                {/* Preset Amount Chips */}
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
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paystack')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all ${
                      paymentMethod === 'paystack'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span>Card / Online Pay</span>
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
              </div>

              {/* Bank Details display if Transfer chosen */}
              {paymentMethod === 'transfer' && (
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Landmark size={14} /> Church Bank Account Details
                  </div>
                  {givingOptions?.bankAccounts?.length > 0 ? (
                    givingOptions.bankAccounts.map((b, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-800">{b.bank_name || b.bankName}</div>
                          <div className="text-gray-500 font-mono tracking-wider">{b.account_number || b.accountNumber}</div>
                          <div className="text-[10px] text-gray-400">{b.account_name || b.accountName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(b.account_number || b.accountNumber)}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                          title="Copy account number"
                        >
                          {copiedAccount ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
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
                <span>{submitting ? 'Recording Giving…' : `Give ${amount ? fmt(amount) : ''} for ${givingType}`}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
