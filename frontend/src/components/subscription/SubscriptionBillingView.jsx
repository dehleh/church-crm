import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard, Check, Sparkles, Building2, GitBranch, ArrowRight,
  ShieldCheck, Loader2, Clock, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink,
  Printer, FileText
} from 'lucide-react';
import { subscriptionAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

export default function SubscriptionBillingView({ isExpiredScreen = false, onPaymentSuccess }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const billingCycle = 'annual';
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState([]);
  const [mockModal, setMockModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);

  // Load current subscription status
  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await subscriptionAPI.getCurrent();
      setData(res.data.data);
      // Auto-select current plan or recommended
      if (res.data.data?.subscriptionPlan === 'starter') {
        setSelectedPlan('starter');
      } else {
        setSelectedPlan('growth');
      }
    } catch {
      toast.error('Could not load subscription details');
    } finally {
      setLoading(false);
    }
  };

  // Load history
  const loadHistory = async () => {
    try {
      const res = await subscriptionAPI.getHistory();
      setHistory(res.data.data || []);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    loadHistory();
  }, []);

  // Handle return from Paystack callback with ?reference=
  useEffect(() => {
    const ref = params.get('reference');
    if (ref && !verifying) {
      verifyPayment(ref);
    }
  }, [params]);

  const verifyPayment = async (reference) => {
    setVerifying(true);
    try {
      const res = await subscriptionAPI.verify({ reference });
      toast.success(res.data.message || 'Subscription successfully activated!');
      await refreshUser?.();
      await loadStatus();
      await loadHistory();

      // Clean search params from URL
      params.delete('reference');
      params.delete('status');
      params.delete('mock');
      setSearchParams(params, { replace: true });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else if (isExpiredScreen) {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleStartPayment = async (planKey) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:hello@themobilemissionary.org?subject=Enterprise%20ChurchOS%20Inquiry';
      return;
    }

    setPaying(true);
    try {
      const res = await subscriptionAPI.initialize({
        plan: planKey,
        billingCycle,
      });

      const { authorizationUrl, reference, mock } = res.data.data;

      if (mock) {
        // Local dev mock mode
        setMockModal({
          plan: planKey,
          reference,
          amountNgn: res.data.data.amountNgn,
          billingCycle,
        });
      } else if (authorizationUrl) {
        // Live Paystack redirect
        window.location.href = authorizationUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start payment');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmMockPayment = async () => {
    if (!mockModal?.reference) return;
    const ref = mockModal.reference;
    setMockModal(null);
    await verifyPayment(ref);
  };

  const plans = [
    {
      key: 'starter',
      name: 'Starter Plan',
      price: '₦250,000',
      period: '/ year',
      tagline: 'Best for single-campus churches — billed annually',
      discountNote: 'Includes 2 months free',
      multiBranch: false,
      features: [
        'Single branch / campus',
        'Unlimited member directory',
        'Event scheduling & QR attendance check-in',
        'First-timer conversion pipeline',
        'Income & expense tracking (Tithes/Offerings)',
        'Basic financial & attendance reports',
        'Standard email support',
      ],
      highlight: false,
    },
    {
      key: 'growth',
      name: 'Growth Plan',
      price: '₦600,000',
      period: '/ year',
      tagline: 'Designed for growing multi-branch church networks — billed annually',
      discountNote: 'Includes 2 months free',
      multiBranch: true,
      features: [
        'Up to 3 branch campuses',
        'Branch-scoped pastors with role permissions',
        'Everything in Starter Plan',
        'Multi-campus consolidated dashboard',
        'SMS & bulk communication blasts',
        'Pastoral counseling & welfare requests',
        'Advanced financial budgets & exports',
        'Priority technical support',
      ],
      highlight: true,
    },
    {
      key: 'enterprise',
      name: 'Enterprise Plan',
      price: 'Custom',
      period: '',
      tagline: 'For large denominations (10+ campuses or 5,000+ members)',
      features: [
        'Unlimited branches & campuses',
        'Unlimited members & users',
        'Custom domain & dedicated hosting option',
        'Dedicated onboarding manager',
        'Custom reporting & API integrations',
        '24/7 VIP pastoral support',
      ],
      highlight: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const currentPlan = data?.subscriptionPlan || 'trial';
  const expires = data?.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Verification Overlay */}
      {verifying && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-3 text-blue-800">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          <span className="font-semibold text-sm">Verifying transaction with Paystack… Please hold on.</span>
        </div>
      )}

      {/* Subscription Status Card */}
      <div className="card bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">Current Status</span>
              {data?.isExpired ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Expired</span>
              ) : data?.isTrial ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Clock size={12} /> 14-Day Free Trial
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Active Subscription
                </span>
              )}
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 capitalize mt-1">
              {currentPlan.replace('_', ' ')} Plan
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {data?.isExpired ? (
                <span className="text-red-600 font-medium">Your access expired on {expires}. Please choose a plan below to renew.</span>
              ) : data?.isTrial ? (
                <span>You have <strong>{data?.daysRemaining ?? 14} days</strong> remaining on your free trial (expires {expires}).</span>
              ) : (
                <span>Next renewal date: <strong>{expires || 'Auto-renewing'}</strong></span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${data?.multiBranchEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
              {data?.multiBranchEnabled ? <GitBranch size={14} /> : <Building2 size={14} />}
              {data?.multiBranchEnabled ? 'Multi-Branch (3 Campuses)' : 'Single Branch Only'}
            </div>
          </div>
        </div>

        {/* Billing Policy Header */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Choose an Annual Subscription Plan</h3>
            <p className="text-xs text-gray-500">Pick the plan that fits your church structure. Secure payment with Paystack.</p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
            <Sparkles size={14} className="text-brand-600" />
            <span>Annual Billing Policy (Includes 2 Months Free)</span>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.key;
          const isCurrentActive = currentPlan === p.key && !data?.isExpired && !data?.isTrial;

          return (
            <div
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`rounded-2xl p-6 sm:p-7 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                p.highlight
                  ? 'border-brand-600 shadow-xl shadow-brand-600/10 bg-white ring-1 ring-brand-600'
                  : isSelected
                  ? 'border-brand-500 bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                  Most Popular · Multi-Branch
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-brand-600">{p.name}</span>
                  {p.multiBranch ? (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <GitBranch size={11} /> 3 Campuses
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Building2 size={11} /> 1 Campus
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-display font-bold text-gray-900">{p.price}</span>
                  {p.period && <span className="text-xs text-gray-500 font-medium">{p.period}</span>}
                </div>
                {p.discountNote && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{p.discountNote}</p>
                )}

                <p className="mt-3 text-xs text-gray-600 leading-relaxed">{p.tagline}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-5">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                {isCurrentActive ? (
                  <div className="w-full py-2.5 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} /> Current Active Plan
                  </div>
                ) : p.key === 'enterprise' ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStartPayment('enterprise'); }}
                    className="btn-outline w-full justify-center text-xs py-2.5"
                  >
                    Contact Sales
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={paying}
                    onClick={(e) => { e.stopPropagation(); handleStartPayment(p.key); }}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs ${
                      p.highlight
                        ? 'bg-brand-600 hover:bg-brand-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {paying && selectedPlan === p.key ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={15} /> Pay with Paystack
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Security Assurance */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <span>Payments secured with 256-bit bank-grade encryption via Paystack. Cancel or change plans anytime.</span>
        </div>
        <span className="hidden sm:inline-block font-mono text-[11px] text-gray-400">Currency: NGN (Nigerian Naira)</span>
      </div>

      {/* Transaction History */}
      {history.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-gray-900 text-base">Past Subscription Payments</h3>
              <p className="text-xs text-gray-500">Official tax invoices and transaction records for accounting and audit.</p>
            </div>
            <span className="text-xs text-gray-400 font-medium">{history.length} {history.length === 1 ? 'transaction' : 'transactions'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt / Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('en-NG')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{tx.reference}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 capitalize">{tx.plan}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">₦{Number(tx.amountNgn).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setReceiptModal(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 font-semibold text-[11px] transition"
                      >
                        <FileText size={12} /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Printable Receipt & Tax Invoice Modal */}
      <Modal
        open={Boolean(receiptModal)}
        onClose={() => setReceiptModal(null)}
        title="Official Payment Receipt"
        size="lg"
        footer={(
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-400">Authenticated by Paystack & ChurchOS</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setReceiptModal(null)} className="btn-secondary">Close</button>
              <button
                onClick={() => window.print()}
                className="btn-primary flex items-center gap-1.5"
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>
          </div>
        )}
      >
        {receiptModal && (
          <div id="churchos-printable-receipt" className="p-4 sm:p-6 bg-white text-gray-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b-2 border-gray-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                    †
                  </div>
                  <span className="text-xl font-display font-extrabold text-gray-900 tracking-tight">ChurchOS</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Cloud Church Management & Operations Platform</p>
                <p className="text-[11px] text-gray-400">hello@themobilemissionary.org · cos.themobilemissionary.org</p>
              </div>
              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ Payment Received
                </span>
                <p className="text-xs font-mono text-gray-500 mt-2">Ref: {receiptModal.reference}</p>
                <p className="text-xs text-gray-400">
                  {new Date(receiptModal.created_at).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Billed To / From */}
            <div className="grid grid-cols-2 gap-4 py-5 border-b border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">Customer / Church</span>
                <p className="font-bold text-gray-900 text-sm">{data?.churchName || user?.churchName || 'Church Account'}</p>
                <p className="text-gray-500 mt-0.5">Admin: {user?.firstName} {user?.lastName} ({user?.email})</p>
                <p className="text-gray-500">Domain: {data?.churchSlug ? `cos.themobilemissionary.org/${data.churchSlug}` : 'cos.themobilemissionary.org'}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">Billing Details</span>
                <p className="font-semibold text-gray-800">Payment Gateway: Paystack</p>
                <p className="text-gray-500">Currency: NGN (₦)</p>
                <p className="text-gray-500">Status: Settled (Success)</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-5">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px]">
                    <th className="py-2 font-semibold">Description</th>
                    <th className="py-2 text-center font-semibold">Tier</th>
                    <th className="py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3">
                      <p className="font-bold text-gray-900 capitalize">ChurchOS Cloud - {receiptModal.plan} Plan (1 Year Annual Subscription)</p>
                      <p className="text-[11px] text-gray-500">
                        {receiptModal.plan === 'growth'
                          ? 'Multi-branch coverage (up to 3 campuses), unlimited attendance tracking, automated finance reports (Annual validity).'
                          : 'Single-branch HQ church coverage, congregation management, service attendance, giving tracker (Annual validity).'}
                      </p>
                    </td>
                    <td className="py-3 text-center capitalize font-medium text-gray-700">{receiptModal.plan}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">₦{Number(receiptModal.amountNgn).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation */}
              <div className="pt-4 border-t border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span>
                  <span>₦{Number(receiptModal.amountNgn).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Value Added Tax (VAT 0% - Educational/Religious Exemption):</span>
                  <span>₦0</span>
                </div>
                <div className="flex justify-between text-base font-display font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700">₦{Number(receiptModal.amountNgn).toLocaleString()} NGN</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400 space-y-1">
              <p>This is an official system-generated payment receipt for church auditing and governance.</p>
              <p>Thank you for partnering with ChurchOS to empower your ministry.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Mock Paystack Payment Modal (For local dev environment) */}
      <Modal
        open={Boolean(mockModal)}
        onClose={() => setMockModal(null)}
        title="Paystack Checkout (Test Environment)"
        size="md"
        footer={(
          <>
            <button onClick={() => setMockModal(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleConfirmMockPayment}
              disabled={verifying}
              className="btn-primary flex items-center gap-1.5"
            >
              {verifying ? <Loader2 size={15} className="animate-spin" /> : '✓ Simulate Successful Payment'}
            </button>
          </>
        )}
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={24} />
          </div>
          <h3 className="font-display font-bold text-gray-900 text-lg">Paystack Simulated Gateway</h3>
          <p className="text-xs text-gray-500 mt-1">
            Running in local development mode without live Paystack secret key. Click below to simulate an immediate successful card charge.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan:</span>
              <span className="font-semibold text-gray-900 capitalize">{mockModal?.plan} Plan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Billing Cycle:</span>
              <span className="font-semibold text-gray-900 capitalize">{mockModal?.billingCycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Due:</span>
              <span className="font-bold text-emerald-600 text-sm">₦{Number(mockModal?.amountNgn || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px] pt-2 border-t border-gray-200">
              <span className="text-gray-400">Ref:</span>
              <span className="text-gray-600">{mockModal?.reference}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
