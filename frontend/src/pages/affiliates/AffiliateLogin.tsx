import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';
import { api, apiErrorMessage } from '../../lib/api';
import { AFFILIATE_REFRESH_KEY, AFFILIATE_TOKEN_KEY } from '../../lib/affiliate';

export const AffiliateLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/affiliates/auth/login', { email, password });
      localStorage.setItem(AFFILIATE_TOKEN_KEY, res.data.access_token);
      localStorage.setItem(AFFILIATE_REFRESH_KEY, res.data.refresh_token);
      navigate('/affiliates/dashboard', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingShell>
      <Seo title="Affiliate Login" description="Log in to your GentleTap affiliate dashboard." path="/affiliates/login" noindex />
      <div className="max-w-md mx-auto px-6 py-20 w-full">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Affiliate login</h1>
        <p className="text-gray-600 mb-8">Access your referral links and earnings.</p>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Not an affiliate yet?{' '}
            <Link to="/affiliates" className="text-blue-600 hover:text-blue-700 font-medium">
              Apply here
            </Link>
          </p>
        </form>
      </div>
    </MarketingShell>
  );
};
