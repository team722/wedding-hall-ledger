import { useState } from 'react';
import { useAuth } from '../auth';
import { Navigate } from 'react-router-dom';
import { LogIn, Lock } from 'lucide-react';
import { FullScreenLoader } from '../components/Loader';

export default function Login({ defaultPortal }: { defaultPortal?: 'admin' | 'viewer' }) {
  const { user, login, loading, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;

  if (user) {
    if (isAdmin) {
      if (defaultPortal === 'viewer') return <Navigate to="/viewer" />;
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/viewer" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif italic tracking-tight text-stone-900 mb-2">Wedding Hall Ecosystem</h1>
        <p className="text-stone-500 text-sm uppercase tracking-widest">
          Sign in to your account
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200 max-w-md w-full p-8">
        <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full mt-4 flex items-center justify-center px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all transform active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-3" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-stone-100 pt-6">
          <p className="text-xs text-stone-400 leading-relaxed">
            Don't have an account? <br/>
            <span className="text-stone-600 font-medium">Please contact the administrator to create one.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
