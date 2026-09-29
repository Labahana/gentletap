import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Fail-closed: only true when the backend explicitly says so.
export const ADMIN_ACCESS_KEY = ['adminAccessCheck'];

export function useAdminAccess() {
  const { data, isError } = useQuery({
    queryKey: ADMIN_ACCESS_KEY,
    queryFn: async () => (await api.get('/admin/access-check')).data,
    staleTime: 60_000,
    retry: 1,
  });
  return {
    // Fail-closed, but never stuck: a transient/failed check must not leave the
    // console frozen on "Checking access…" forever — resolve to non-admin on error.
    isAdmin: data ? !!data.is_admin : isError ? false : null,
    email: (data?.email as string) ?? null,
  };
}

export function useIsAdmin() {
  return useAdminAccess().isAdmin === true;
}
