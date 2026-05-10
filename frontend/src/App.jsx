import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const FirstTimers = lazy(() => import('./pages/FirstTimers'));
const Events = lazy(() => import('./pages/Events'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Finance = lazy(() => import('./pages/Finance'));
const Departments = lazy(() => import('./pages/Departments'));
const Branches = lazy(() => import('./pages/Branches'));
const Media = lazy(() => import('./pages/Media'));
const Prayer = lazy(() => import('./pages/Prayer'));
const Communications = lazy(() => import('./pages/Communications'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Settings = lazy(() => import('./pages/Settings'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Groups = lazy(() => import('./pages/Groups'));
const Assets = lazy(() => import('./pages/Assets'));
const Counseling = lazy(() => import('./pages/Counseling'));
const Welfare = lazy(() => import('./pages/Welfare'));
const Procurement = lazy(() => import('./pages/Procurement'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));
const PlatformAuditLog = lazy(() => import('./pages/PlatformAuditLog'));
const PlatformLayout = lazy(() => import('./components/layout/PlatformLayout'));
const PublicFirstTimerForm = lazy(() => import('./pages/PublicFirstTimerForm'));
const PublicMemberForm = lazy(() => import('./pages/PublicMemberForm'));
const PublicPrayerForm = lazy(() => import('./pages/PublicPrayerForm'));
const PublicWelfareForm = lazy(() => import('./pages/PublicWelfareForm'));
const PublicEventCheckIn = lazy(() => import('./pages/PublicEventCheckIn'));

const MemberLogin = lazy(() => import('./pages/portal/MemberLogin'));
const MemberSetPassword = lazy(() => import('./pages/portal/MemberSetPassword'));
const MemberPortalLayout = lazy(() => import('./pages/portal/MemberPortalLayout'));
const MemberHome = lazy(() => import('./pages/portal/MemberHome'));
const MemberPortalProfile = lazy(() => import('./pages/portal/MemberPortalProfile'));
const MemberPortalGiving = lazy(() => import('./pages/portal/MemberPortalGiving'));
const MemberPortalEvents = lazy(() => import('./pages/portal/MemberPortalEvents'));
const MemberPortalPrayer = lazy(() => import('./pages/portal/MemberPortalPrayer'));
const MemberPortalGroups = lazy(() => import('./pages/portal/MemberPortalGroups'));
const MemberPortalCounseling = lazy(() => import('./pages/portal/MemberPortalCounseling'));
const MemberPortalWelfare = lazy(() => import('./pages/portal/MemberPortalWelfare'));

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
    </div>
  );
}

function L({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg">
        <span className="text-white text-3xl">⛪</span>
      </div>
      <div className="font-display font-bold text-gray-900 text-xl">ChurchOS</div>
      <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mt-1"></div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.isSuperAdmin) return <Navigate to="/platform" replace />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.isSuperAdmin) return <Navigate to="/platform" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <L><Landing /></L>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/connect/:churchSlug/first-timer" element={<L><PublicFirstTimerForm /></L>} />
          <Route path="/connect/:churchSlug/member" element={<L><PublicMemberForm /></L>} />
          <Route path="/connect/:churchSlug/prayer" element={<L><PublicPrayerForm /></L>} />
          <Route path="/connect/:churchSlug/welfare" element={<L><PublicWelfareForm /></L>} />
          <Route path="/connect/:churchSlug/events/:eventId/check-in" element={<L><PublicEventCheckIn /></L>} />

          {/* Member-facing portal */}
          <Route path="/portal/:churchSlug/login" element={<L><MemberLogin /></L>} />
          <Route path="/portal/:churchSlug/set-password" element={<L><MemberSetPassword /></L>} />
          <Route path="/portal/:churchSlug" element={<L><MemberPortalLayout /></L>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<L><MemberHome /></L>} />
            <Route path="profile" element={<L><MemberPortalProfile /></L>} />
            <Route path="giving" element={<L><MemberPortalGiving /></L>} />
            <Route path="events" element={<L><MemberPortalEvents /></L>} />
            <Route path="prayer" element={<L><MemberPortalPrayer /></L>} />
            <Route path="groups" element={<L><MemberPortalGroups /></L>} />
            <Route path="counseling" element={<L><MemberPortalCounseling /></L>} />
            <Route path="welfare" element={<L><MemberPortalWelfare /></L>} />
          </Route>

          {/* Platform Admin — completely separate shell */}
          <Route path="/platform" element={<SuperAdminRoute><L><PlatformLayout /></L></SuperAdminRoute>}>
            <Route index element={<L><PlatformAdmin /></L>} />
            <Route path="audit-log" element={<L><PlatformAuditLog /></L>} />
          </Route>

          <Route path="/" element={<RootRoute />} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="dashboard" element={<L><Dashboard /></L>} />
            <Route path="members" element={<L><Members /></L>} />
            <Route path="members/:id" element={<L><MemberProfile /></L>} />
            <Route path="first-timers" element={<L><FirstTimers /></L>} />
            <Route path="events" element={<L><Events /></L>} />
            <Route path="events/:eventId/attendance" element={<L><Attendance /></L>} />
            <Route path="attendance" element={<L><Attendance /></L>} />
            <Route path="finance" element={<L><Finance /></L>} />
            <Route path="budgets" element={<L><Budgets /></L>} />
            <Route path="departments" element={<L><Departments /></L>} />
            <Route path="groups" element={<L><Groups /></L>} />
            <Route path="branches" element={<L><Branches /></L>} />
            <Route path="media" element={<L><Media /></L>} />
            <Route path="prayer" element={<L><Prayer /></L>} />
            <Route path="communications" element={<L><Communications /></L>} />
            <Route path="users" element={<L><UserManagement /></L>} />
            <Route path="reports" element={<L><Reports /></L>} />
            <Route path="follow-ups" element={<L><FollowUps /></L>} />
            <Route path="assets" element={<L><Assets /></L>} />
            <Route path="counseling" element={<L><Counseling /></L>} />
            <Route path="welfare" element={<L><Welfare /></L>} />
            <Route path="procurement" element={<L><Procurement /></L>} />
            <Route path="settings" element={<L><Settings /></L>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </AuthProvider>
    </ErrorBoundary>
  );
}
