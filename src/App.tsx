import React from 'react';
import AuditLogs from './components/AuditLogs';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AdminDashboard from './pages/AdminDashboard';
import MemberManagement from './components/MemberManagement';
import ViewerDashboard from './pages/ViewerDashboard';
import ViewerHome from './pages/ViewerHome';
import ViewerCalendar from './pages/ViewerCalendar';
import EventHub from './pages/EventHub';
import Login from './pages/Login';
import Layout from './components/Layout';
import BookingForm from './components/BookingForm';
import TransactionModal from './components/TransactionModal';
import { FullScreenLoader } from './components/Loader';

function PrivateRoute({ children, role }: { children: React.ReactNode; role: 'admin' | 'viewer' }) {
  const { user, profile, loading, isAdmin, isViewer, logout } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200 max-w-md">
          <h2 className="text-2xl font-serif italic text-stone-900 mb-4">Profile Not Found</h2>
          <p className="text-stone-600 mb-6">
            We couldn't load your profile. This might be a temporary connection issue.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              Retry Loading
            </button>
            <button
              onClick={() => logout()}
              className="px-6 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
            >
              Logout & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profile.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200 max-w-md">
          <h2 className="text-2xl font-serif italic text-stone-900 mb-4">Account {profile.status}</h2>
          <p className="text-stone-600 mb-6">
            Your account has been {profile.status}. Please contact the administrator for more information.
          </p>
          <button
            onClick={async () => {
              await logout();
              window.location.href = '/login';
            }}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (role === 'admin' && !isAdmin) return <Navigate to="/viewer" />;
  if (role === 'viewer' && !isViewer) return <Navigate to="/login" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/admin" element={<Login defaultPortal="admin" />} />
          <Route path="/login/viewer" element={<Login defaultPortal="viewer" />} />
          <Route
            path="/admin/*"
            element={
              <PrivateRoute role="admin">
                <Layout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="add" element={<BookingForm />} />
                    <Route path="edit/:id" element={<BookingForm />} />
                    <Route path="hub" element={<EventHub />} />
                    <Route path="members" element={<MemberManagement />} />
                    <Route path="logs" element={<AuditLogs />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/viewer/*"
            element={
              <PrivateRoute role="viewer">
                <Layout>
                  <Routes>
                    <Route index element={<ViewerHome />} />
                    <Route path="calendar" element={<ViewerCalendar />} />
                    <Route path="ledger" element={<ViewerDashboard />} />
                    <Route path="hub" element={<EventHub />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
