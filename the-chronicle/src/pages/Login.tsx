import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/SupabaseProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const { signInEmail, user, isAdmin, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      const from = (location.state as any)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInEmail(identifier, password);
      // Success redirect is handled by the useEffect above
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="absolute top-8 left-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-text3 hover:text-accent transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Site
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg border border-border shadow-2xl overflow-hidden">
          <div className="p-12">
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[2px] rounded mb-4">
                Secure Access
              </div>
              <h2 className="text-4xl font-serif font-bold text-text tracking-tight">Admin Login</h2>
              <p className="text-text3 mt-4 text-sm font-medium">
                Enter your credentials or use the Master ID <strong className="text-accent">admin</strong> to access the dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest ml-1">Admin ID / Email</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text3" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. admin"
                    className="w-full pl-12 pr-4 py-4 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-text transition-all"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text3" />
                  <input 
                    type="password" 
                    required
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-4 py-4 bg-bg2 border border-border rounded focus:outline-none focus:border-accent text-text transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded border border-red-100 text-xs font-bold uppercase tracking-widest"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-accent text-white rounded font-bold hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 uppercase tracking-[2px] text-xs"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-border text-center">
              <p className="text-[10px] font-bold text-text3 uppercase tracking-widest">
                Protected by The Chronicle Security
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
