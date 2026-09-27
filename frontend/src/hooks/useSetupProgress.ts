import { useMemo } from 'react';
import { useAutopilotStatus } from '@/hooks/useAutopilotStatus';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

export interface SetupItem {
  key: string;
  label: string;
  done: boolean;
  link: string;
}

export interface SetupProgress {
  items: SetupItem[];
  doneCount: number;
  total: number;
  /** True once the wizard is finished OR every live setup signal is green. */
  complete: boolean;
  /** Show the reminder anywhere in the app until setup is complete. */
  shouldShow: boolean;
}

/**
 * Setup state derived from live signals (connections, autopilot mode, running
 * sequences) rather than the wizard step, so the checklist stays honest even
 * for users who finish setup outside the wizard.
 */
export function useSetupProgress(): SetupProgress {
  const { data: autopilot } = useAutopilotStatus();
  const { data: onboarding } = useOnboardingStatus();

  return useMemo(() => {
    const items: SetupItem[] = [
      {
        key: 'connect',
        label: 'Connect your accounting',
        done: (autopilot?.connected_sources ?? 0) > 0,
        link: '/settings',
      },
      {
        key: 'invoices',
        label: 'Bring in outstanding invoices',
        done: (autopilot?.active_sequences ?? 0) > 0,
        link: '/invoices',
      },
      {
        key: 'autopilot',
        label: 'Turn on Autopilot',
        done: autopilot?.mode === 'autopilot',
        link: '/autopilot',
      },
    ];
    const doneCount = items.filter((i) => i.done).length;
    const total = items.length;
    const complete = !!onboarding?.complete || items.every((i) => i.done);
    return { items, doneCount, total, complete, shouldShow: !complete };
  }, [autopilot, onboarding]);
}
