import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

export const ONBOARDING_KEY = ['onboarding'];

export interface OnboardingStatus {
  step: number;
  completed_at?: string | null;
  data?: Record<string, unknown>;
  complete: boolean;
  dismissed: boolean;
}

export function useOnboardingStatus(enabled = true) {
  return useQuery<OnboardingStatus>({
    queryKey: ONBOARDING_KEY,
    queryFn: async () => (await api.get('/onboarding')).data,
    enabled,
  });
}

/** Clears the server-side skip flag and opens the wizard at the saved step. */
export function useResumeSetup() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => (await api.post('/onboarding/resume')).data,
    onSuccess: () => {
      qc.setQueryData<OnboardingStatus>(ONBOARDING_KEY, (old) =>
        old ? { ...old, dismissed: false } : old
      );
      navigate('/onboarding');
    },
  });
}
