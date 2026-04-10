import { useState } from 'react';
import { useAuth } from '../auth';
import { Link, Navigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Users, Eye } from 'lucide-react';
import { FullScreenLoader } from '../components/Loader';

export default function Login({ defaultPortal }: { defaultPortal?: 'admin' | 'viewer' }) {
  const { user, login, loading, isAdmin } = useAuth();
  const [intendedPortal, setIntendedPortal] = useState<'admin' | 'viewer' | null>(defaultPortal || null);

  if (loading) return <FullScreenLoader />;

  if (user) {
    // If already logged in, allow switching or redirect to default
    if (isAdmin) {
      if (intendedPortal === 'viewer') return <Navigate to="/viewer" />;
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/viewer" />;
  }

  const handleLogin = async (portal: 'admin' | 'viewer') => {
    setIntendedPortal(portal);
    await login();
  };

  const renderAdminCard = () => (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col max-w-md w-full">
      <div className="p-8 text-center flex-1">
        <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-stone-900 mb-3">Management App</h2>
        <p className="text-stone-600 text-sm leading-relaxed mb-8">
          The core engine for hall management. Upload edits, manage financial records, and oversee all operations.
        </p>

        <button
          onClick={() => handleLogin('admin')}
          className="w-full cursor-pointer flex items-center justify-center px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all transform active:scale-95 shadow-md"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Super Admin Sign In
        </button>
      </div>
      <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Management Only</p>
      </div>
    </div>
  );

  const renderViewerCard = () => (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col max-w-md w-full">
      <div className="p-8 text-center flex-1">
        <div className="w-16 h-16 bg-stone-100 text-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-stone-200">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-stone-900 mb-3">Viewer App</h2>
        <p className="text-stone-600 text-sm leading-relaxed mb-8">
          The public-facing portal. View event news, community posts, hall availability, and the read-only ledger.
        </p>

        <button
          onClick={() => handleLogin('viewer')}
          className="w-full cursor-pointer flex items-center justify-center px-6 py-3 bg-white text-stone-900 border-2 border-stone-900 rounded-xl font-medium hover:bg-stone-50 transition-all transform active:scale-95 shadow-md"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Viewer Sign In
        </button>
      </div>
      <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Member Access Required</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-serif italic tracking-tight text-stone-900 mb-2">Wedding Hall Ecosystem</h1>
        <p className="text-stone-500 text-sm uppercase tracking-widest">
          {defaultPortal ? `Sign in to ${defaultPortal === 'admin' ? 'Super Admin' : 'Viewer'} App` : 'Select the application you wish to enter'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center w-full max-w-5xl">
        {(!defaultPortal || defaultPortal === 'admin') && (
          <div className="flex-1 flex flex-col items-center">
            {renderAdminCard()}
          </div>
        )}
        {(!defaultPortal || defaultPortal === 'viewer') && (
          <div className="flex-1 flex flex-col items-center">
            {renderViewerCard()}
          </div>
        )}
      </div>

      {!defaultPortal && (
        <p className="mt-12 text-stone-400 text-xs uppercase tracking-tighter">
          Securely powered by Google Authentication
        </p>
      )}

      {defaultPortal && (
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-8 text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors"
        >
          ← Back to Portal Selection
        </button>
      )}
    </div>
  );
}
