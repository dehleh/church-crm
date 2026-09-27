import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasRole, getRoleTitle, getRoleBadge } from '../../utils/rbac';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';

export default function RoleRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is member, route them appropriately
  if (user.role === 'member' && !allowedRoles.includes('member')) {
    if (user.churchSlug) {
      return <Navigate to={`/portal/${user.churchSlug}/home`} replace />;
    }
  }

  const authorized = hasRole(user, allowedRoles);

  if (!authorized) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-12">
        <div className="bg-white border border-rose-100 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <Lock size={32} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-rose-50 text-rose-700">
            <ShieldAlert size={14} /> Role-Based Access Control
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Your current assigned role ({getRoleTitle(user?.role)}) does not have permission to access this module.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 max-w-md mx-auto mb-6 text-left">
            <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Your Account Role</div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">{user.firstName} {user.lastName}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${getRoleBadge(user.role)}`}>
                {getRoleTitle(user.role)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              If you require access to this section, please contact your Church Administrator.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link to="/dashboard" className="btn-primary flex items-center gap-2">
              <Home size={16} /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
