import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  plan: string;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: {
    user: User;
    orgId: string;
    orgName: string;
    plan: string;
    accessToken: string;
    refreshToken: string;
  }) => void;
  logout: () => void;
  updateOrgName: (name: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('gentletap_user') || 'null'),
  orgId: localStorage.getItem('gentletap_org_id') || 'org_demo',
  orgName: localStorage.getItem('gentletap_org_name') || 'labahana',
  plan: localStorage.getItem('gentletap_plan') || 'free',
  accessToken: localStorage.getItem('gentletap_access_token'),
  refreshToken: localStorage.getItem('gentletap_refresh_token'),
  isAuthenticated: !!localStorage.getItem('gentletap_access_token'),

  setAuth: (data) => {
    localStorage.setItem('gentletap_access_token', data.accessToken);
    localStorage.setItem('gentletap_refresh_token', data.refreshToken);
    localStorage.setItem('gentletap_org_id', data.orgId);
    localStorage.setItem('gentletap_org_name', data.orgName);
    localStorage.setItem('gentletap_plan', data.plan);
    localStorage.setItem('gentletap_user', JSON.stringify(data.user));

    set({
      user: data.user,
      orgId: data.orgId,
      orgName: data.orgName,
      plan: data.plan,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('gentletap_access_token');
    localStorage.removeItem('gentletap_refresh_token');
    localStorage.removeItem('gentletap_org_id');
    localStorage.removeItem('gentletap_org_name');
    localStorage.removeItem('gentletap_plan');
    localStorage.removeItem('gentletap_user');

    set({
      user: null,
      orgId: null,
      orgName: null,
      plan: 'free',
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  updateOrgName: (name) => {
    localStorage.setItem('gentletap_org_name', name);
    set({ orgName: name });
  },
}));
