import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Don't clobber a caller-supplied Authorization header (e.g. the affiliate
  // dashboard uses a separate affiliate token; a dual-role user must keep it).
  const existing =
    config.headers?.Authorization || config.headers?.get?.('Authorization');
  if (!existing) {
    const token = localStorage.getItem('gentletap_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/google/callback'];

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('gentletap_refresh_token');
  if (!refreshToken) return null;
  try {
    // Raw axios (not `api`) so the stale access token isn't attached.
    const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
    const data = res.data;
    const store = useAuthStore.getState();
    store.setAuth({
      user: store.user ?? { id: data.user_id, email: data.email, full_name: data.full_name },
      orgId: data.org_id,
      orgName: data.org_name,
      plan: data.plan,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return data.access_token as string;
  } catch (err: any) {
    // Only end the session when the server actually rejected the refresh token
    // (invalid/expired). A network error is transient — keep the session so the
    // next request can retry the refresh instead of forcing a logout.
    if (err?.response) {
      useAuthStore.getState().logout();
    }
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config ?? {};
    const url: string = original.url ?? '';
    const isAuthCall = AUTH_PATHS.some((p) => url.includes(p));

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      // Single-flight: concurrent 401s share one refresh call.
      refreshPromise =
        refreshPromise || refreshAccessToken().finally(() => (refreshPromise = null));
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: any, fallback: string): string {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  // FastAPI 422 validation errors return `detail` as an array of objects —
  // rendering that as a React child crashes ("Objects are not valid…"). Coerce.
  if (Array.isArray(detail)) {
    const first: any = detail[0];
    const msg = typeof first?.msg === 'string' ? first.msg : null;
    return msg || 'Invalid request. Please check your input.';
  }
  if (detail != null && typeof detail === 'object') {
    return 'Invalid request. Please check your input.';
  }
  if (err.request && !err.response) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return fallback;
}
