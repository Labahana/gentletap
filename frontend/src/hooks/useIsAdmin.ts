import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Fail-closed: only true when the backend explicitly says so.
export const ADMIN_ACCESS_KEY = ['adminAccessCheck'];

export function useAdminAccess() {
  const { data } = useQuery({
    queryKey: ADMIN_ACCESS_KEY,
    queryFn: async () => (await api.get('/admin/access-check')).data,
    staleTime: 60_000,
    retry: false,
  });
  return {
    isAdmin: data ? !!data.is_admin : null,
    email: (data?.email as string) ?? null,
  };
}

export function useIsAdmin() {
  return useAdminAccess().isAdmin === true;
}
