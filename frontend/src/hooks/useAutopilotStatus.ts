import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AutopilotStatus } from '@/lib/autopilot';

export const AUTOPILOT_STATUS_KEY = ['autopilotStatus'];

export function useAutopilotStatus() {
  return useQuery<AutopilotStatus>({
    queryKey: AUTOPILOT_STATUS_KEY,
    queryFn: async () => (await api.get('/autopilot/status')).data,
    refetchInterval: 60_000,
  });
}
