import { Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LicenseExpired() {
  const { user, logout } = useAuth();
  const plan = user?.subscriptionPlan;
  const expires = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-8 text-center">
        <div className="w-14 h-14 mx-auto bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
          <Lock size={26} />
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          {plan === 'trial' ? 'Your free trial has ended' : 'License required'}
        </h1>
        <p className="text-gray-600 mt-2">
          {plan
            ? <>Your <strong className="capitalize">{plan}</strong> plan {expires ? <>expired on <strong>{expires}</strong></> : 'is no longer active'}.</>
            : 'Your church does not have an active license to use ChurchOS.'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          To continue using the product, please request or renew a license.
        </p>

        <div className="mt-6 grid gap-2">
          <Link to="/get-started" className="btn-primary w-full justify-center">
            Request a license
          </Link>
          <a href="mailto:support@themobilemissionary.org" className="btn-outline w-full justify-center gap-2">
            <Mail size={14}/> Contact admin
          </a>
        </div>

        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 mt-6">
          Sign out
        </button>
      </div>
    </div>
  );
}
