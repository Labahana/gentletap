import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { tryAttributeAfterAuth } from '@/lib/affiliate';
import { Lock, Mail } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthShell, GoogleButton, Divider } from '@/components/marketing/AuthShell';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data;
      setAuth({
        user: { id: data.user_id, email: data.email, full_name: data.full_name },
        orgId: data.org_id,
        orgName: data.org_name,
        plan: data.plan,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      void tryAttributeAfterAuth();
      // Hard navigation guarantees ProtectedRoute re-hydrates isAuthenticated
      // from localStorage — immune to any in-memory state transition glitch.
      if (!localStorage.getItem('gentletap_access_token')) {
        throw new Error('Session could not be stored. Enable site data and retry.');
      }
      window.location.replace('/onboarding');
      return;
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Invalid login credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await api.get('/auth/google/url');
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start Google sign-in');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to your GentleTap account</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} label="Sign in with Google" />

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mkt-label">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mkt-input pl-10"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="mkt-label">Password</label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mkt-input pl-10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-mkt-primary mt-2 w-full disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Don’t have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
          Sign up free
        </Link>
      </p>
    </AuthShell>
  );
};
