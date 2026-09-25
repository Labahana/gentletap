import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAffiliateRefCookie } from '@/lib/affiliate';
import { Lock, Mail, User, Building, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthShell, GoogleButton, Divider } from '@/components/marketing/AuthShell';

export const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const refCode = getAffiliateRefCookie();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
        organization_name: orgName,
        ref_code: getAffiliateRefCookie(),
      });
      const data = res.data;
      setAuth({
        user: { id: data.user_id, email: data.email, full_name: data.full_name },
        orgId: data.org_id,
        orgName: data.org_name,
        plan: data.plan,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      if (!localStorage.getItem('gentletap_access_token')) {
        throw new Error('Session could not be stored. Enable site data and retry.');
      }
      window.location.replace('/onboarding');
      return;
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Failed to create account'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const urlRes = await api.get('/auth/google/url');
      window.location.href = urlRes.data.url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start Google sign-up');
      setGoogleLoading(false);
    }
  };

  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Passwords match', ok: confirm.length > 0 && password === confirm },
  ];

  return (
    <AuthShell mode="signup">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="mt-1 text-sm text-slate-600">Start automating your invoice follow-ups</p>
      </div>

      {refCode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-2.5 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Referral applied — you’ll get 20% off your first 3 months of any paid plan.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <GoogleButton onClick={handleGoogleSignup} loading={googleLoading} label="Sign up with Google" />

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mkt-label">Full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="mkt-input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mkt-label">Company / org name</label>
          <div className="relative">
            <Building className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Agency"
              className="mkt-input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mkt-label">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
              className="mkt-input pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mkt-label">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mkt-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="mkt-label">Confirm password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600/50" />
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mkt-input pl-10"
              />
            </div>
          </div>
        </div>

        <ul className="space-y-1">
          {passwordChecks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-600'}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${c.ok ? 'bg-emerald-600' : 'bg-slate-200'}`}
              />
              {c.label}
            </li>
          ))}
        </ul>

        <button
          type="submit"
          disabled={loading}
          className="btn-mkt-primary mt-2 w-full disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-600">
        By creating an account you agree to our{' '}
        <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link> and{' '}
        <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
      </p>

      <p className="mt-4 text-center text-xs text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
