import { Link } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SubscriptionBillingView from '../components/subscription/SubscriptionBillingView';

export default function LicenseExpired() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/30 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Top bar with branding and sign out */}
        <div className="flex items-center justify-between pb-8 border-b border-gray-100 mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TMM" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="font-display font-bold text-xl text-gray-900 leading-tight">ChurchOS</h1>
              <p className="text-xs text-gray-500">{user?.churchName || 'The Mobile Missionaries'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {/* Lockout Notice Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-950">
                {user?.subscriptionPlan === 'trial' ? 'Your 14-Day Free Trial Has Ended' : 'Subscription Required'}
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                All your members, financial records, and church data are securely saved. Choose a plan below to immediately reactivate your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Full self-service billing and Paystack checkout */}
        <SubscriptionBillingView isExpiredScreen={true} />
      </div>
    </div>
  );
}
