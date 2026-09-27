import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import RoleRoute from './components/auth/RoleRoute';
import Login from './pages/Login';
import Register from './pages/Register';

const Landing = lazy(() => import('./pages/Landing'));
const GetStarted = lazy(() => import('./pages/GetStarted'));
const LicenseExpired = lazy(() => import('./pages/LicenseExpired'));
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
const Fellowship = lazy(() => import('./pages/Fellowship'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));
const PlatformAuditLog = lazy(() => import('./pages/PlatformAuditLog'));
const PlatformLicenseRequests = lazy(() => import('./pages/PlatformLicenseRequests'));
const PlatformLayout = lazy(() => import('./components/layout/PlatformLayout'));
const PlatformLogin = lazy(() => import('./pages/PlatformLogin'));
const DailyDevotionals = lazy(() => import('./pages/DailyDevotionals'));
const Discipleship = lazy(() => import('./pages/Discipleship'));
const PublicFirstTimerForm = lazy(() => import('./pages/PublicFirstTimerForm'));
const PublicMemberForm = lazy(() => import('./pages/PublicMemberForm'));
const PublicPrayerForm = lazy(() => import('./pages/PublicPrayerForm'));
const PublicWelfareForm = lazy(() => import('./pages/PublicWelfareForm'));
const PublicEventCheckIn = lazy(() => import('./pages/PublicEventCheckIn'));
const PublicGiving = lazy(() => import('./pages/PublicGiving'));

const MemberLogin = lazy(() => import('./pages/portal/MemberLogin'));
const MemberSetPassword = lazy(() => import('./pages/portal/MemberSetPassword'));
const MemberPortalLayout = lazy(() => import('./pages/portal/MemberPortalLayout'));
const MemberHome = lazy(() => import('./pages/portal/MemberHome'));
const MemberPortalProfile = lazy(() => import('./pages/portal/MemberPortalProfile'));
const MemberPortalFellowship = lazy(() => import('./pages/portal/MemberPortalFellowship'));
const MemberPortalGiving = lazy(() => import('./pages/portal/MemberPortalGiving'));

const MemberPortalEvents = lazy(() => import('./pages/portal/MemberPortalEvents'));
const MemberPortalPrayer = lazy(() => import('./pages/portal/MemberPortalPrayer'));
const MemberPortalGroups = lazy(() => import('./pages/portal/MemberPortalGroups'));
const MemberPortalCounseling = lazy(() => import('./pages/portal/MemberPortalCounseling'));
const MemberPortalWelfare = lazy(() => import('./pages/portal/MemberPortalWelfare'));
const MemberPortalDevotional = lazy(() => import('./pages/portal/MemberPortalDevotional'));
const MemberPortalDiscipleship = lazy(() => import('./pages/portal/MemberPortalDiscipleship'));
const MemberPortalBirthdays = lazy(() => import('./pages/portal/MemberPortalBirthdays'));
const MemberPortalAnnouncements = lazy(() => import('./pages/portal/MemberPortalAnnouncements'));
const MemberPortalMedia = lazy(() => import('./pages/portal/MemberPortalMedia'));

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
      <img src="/logo.png" alt="The Mobile Missionaries" className="w-20 h-20 object-contain" />
      <div className="font-display font-bold text-gray-900 text-xl">The Mobile Missionaries</div>
      <div className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold">Powered by ChurchOS</div>
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
          <Route path="/platform/login" element={<PublicRoute><PlatformLogin /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/get-started" element={<L><GetStarted /></L>} />
          <Route path="/license-expired" element={<L><LicenseExpired /></L>} />
          <Route path="/connect/:churchSlug/first-timer" element={<L><PublicFirstTimerForm /></L>} />
          <Route path="/connect/:churchSlug/member" element={<L><PublicMemberForm /></L>} />
          <Route path="/connect/:churchSlug/prayer" element={<L><PublicPrayerForm /></L>} />
          <Route path="/connect/:churchSlug/welfare" element={<L><PublicWelfareForm /></L>} />
          <Route path="/connect/:churchSlug/events/:eventId/check-in" element={<L><PublicEventCheckIn /></L>} />
          <Route path="/give/:slug" element={<L><PublicGiving /></L>} />
          <Route path="/give" element={<L><PublicGiving /></L>} />

          {/* Member-facing portal */}
          <Route path="/portal/:churchSlug/login" element={<L><MemberLogin /></L>} />
          <Route path="/portal/:churchSlug/set-password" element={<L><MemberSetPassword /></L>} />
          <Route path="/portal/:churchSlug" element={<L><MemberPortalLayout /></L>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<L><MemberHome /></L>} />
            <Route path="profile" element={<L><MemberPortalProfile /></L>} />
            <Route path="birthdays" element={<L><MemberPortalBirthdays /></L>} />
            <Route path="announcements" element={<L><MemberPortalAnnouncements /></L>} />
            <Route path="media" element={<L><MemberPortalMedia /></L>} />
            <Route path="devotionals" element={<L><MemberPortalDevotional /></L>} />
            <Route path="discipleship" element={<L><MemberPortalDiscipleship /></L>} />
            <Route path="fellowship" element={<L><MemberPortalFellowship /></L>} />
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
            <Route path="license-requests" element={<L><PlatformLicenseRequests /></L>} />
          </Route>

          <Route path="/" element={<RootRoute />} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="dashboard" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'finance', 'hod']}><L><Dashboard /></L></RoleRoute>} />
            <Route path="members" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Members /></L></RoleRoute>} />
            <Route path="members/:id" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><MemberProfile /></L></RoleRoute>} />
            <Route path="first-timers" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><FirstTimers /></L></RoleRoute>} />
            <Route path="events" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod', 'finance']}><L><Events /></L></RoleRoute>} />
            <Route path="events/:eventId/attendance" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Attendance /></L></RoleRoute>} />
            <Route path="attendance" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Attendance /></L></RoleRoute>} />
            <Route path="devotionals" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><DailyDevotionals /></L></RoleRoute>} />
            <Route path="discipleship" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Discipleship /></L></RoleRoute>} />
            <Route path="finance" element={<RoleRoute allowedRoles={['admin', 'finance']}><L><Finance /></L></RoleRoute>} />
            <Route path="budgets" element={<RoleRoute allowedRoles={['admin', 'pastor', 'finance']}><L><Budgets /></L></RoleRoute>} />
            <Route path="departments" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Departments /></L></RoleRoute>} />
            <Route path="fellowship" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Fellowship /></L></RoleRoute>} />
            <Route path="groups" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Groups /></L></RoleRoute>} />

            <Route path="branches" element={<RoleRoute allowedRoles={['admin']}><L><Branches /></L></RoleRoute>} />
            <Route path="media" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Media /></L></RoleRoute>} />
            <Route path="prayer" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Prayer /></L></RoleRoute>} />
            <Route path="communications" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director']}><L><Communications /></L></RoleRoute>} />
            <Route path="users" element={<RoleRoute allowedRoles={['admin']}><L><UserManagement /></L></RoleRoute>} />
            <Route path="reports" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'finance']}><L><Reports /></L></RoleRoute>} />
            <Route path="follow-ups" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><FollowUps /></L></RoleRoute>} />
            <Route path="assets" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'hod']}><L><Assets /></L></RoleRoute>} />
            <Route path="counseling" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director']}><L><Counseling /></L></RoleRoute>} />
            <Route path="welfare" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'finance']}><L><Welfare /></L></RoleRoute>} />
            <Route path="procurement" element={<RoleRoute allowedRoles={['admin', 'pastor', 'director', 'finance', 'hod']}><L><Procurement /></L></RoleRoute>} />
            <Route path="settings" element={<RoleRoute allowedRoles={['admin']}><L><Settings /></L></RoleRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </AuthProvider>
    </ErrorBoundary>
  );
}
