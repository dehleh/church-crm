import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import FirstTimers from './pages/FirstTimers';
import Events from './pages/Events';
import Attendance from './pages/Attendance';
import Finance from './pages/Finance';
import Departments from './pages/Departments';
import Branches from './pages/Branches';
import Media from './pages/Media';
import Prayer from './pages/Prayer';
import Communications from './pages/Communications';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import FollowUps from './pages/FollowUps';
import Groups from './pages/Groups';
import Assets from './pages/Assets';

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

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="members" element={<ErrorBoundary><Members /></ErrorBoundary>} />
            <Route path="members/:id" element={<ErrorBoundary><MemberProfile /></ErrorBoundary>} />
            <Route path="first-timers" element={<ErrorBoundary><FirstTimers /></ErrorBoundary>} />
            <Route path="events" element={<ErrorBoundary><Events /></ErrorBoundary>} />
            <Route path="events/:eventId/attendance" element={<ErrorBoundary><Attendance /></ErrorBoundary>} />
            <Route path="attendance" element={<ErrorBoundary><Attendance /></ErrorBoundary>} />
            <Route path="finance" element={<ErrorBoundary><Finance /></ErrorBoundary>} />
            <Route path="budgets" element={<ErrorBoundary><Budgets /></ErrorBoundary>} />
            <Route path="departments" element={<ErrorBoundary><Departments /></ErrorBoundary>} />
            <Route path="groups" element={<ErrorBoundary><Groups /></ErrorBoundary>} />
            <Route path="branches" element={<ErrorBoundary><Branches /></ErrorBoundary>} />
            <Route path="media" element={<ErrorBoundary><Media /></ErrorBoundary>} />
            <Route path="prayer" element={<ErrorBoundary><Prayer /></ErrorBoundary>} />
            <Route path="communications" element={<ErrorBoundary><Communications /></ErrorBoundary>} />
            <Route path="users" element={<ErrorBoundary><UserManagement /></ErrorBoundary>} />
            <Route path="reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
            <Route path="follow-ups" element={<ErrorBoundary><FollowUps /></ErrorBoundary>} />
            <Route path="assets" element={<ErrorBoundary><Assets /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </AuthProvider>
    </ErrorBoundary>
  );
}
