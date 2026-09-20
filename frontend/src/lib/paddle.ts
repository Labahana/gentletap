import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PaddlePublicConfig = {
  client_token?: string | null;
  environment: 'sandbox' | 'production';
};

let paddlePromise: Promise<Paddle | undefined> | null = null;
let cacheKey = '';

async function getPaddle(config: PaddlePublicConfig): Promise<Paddle | undefined> {
  if (!config.client_token) return undefined;
  const key = `${config.environment}:${config.client_token}`;
  if (paddlePromise && cacheKey === key) return paddlePromise;
  cacheKey = key;
  paddlePromise = initializePaddle({
    token: config.client_token,
    environment: config.environment,
  });
  return paddlePromise;
}

/**
 * Open Paddle's overlay checkout for a server-created transaction. Resolves true
 * when the overlay opened, false when Paddle.js is unavailable (caller should
 * fall back to the hosted checkout URL).
 */
export async function openOverlayCheckout(options: {
  config: PaddlePublicConfig | null | undefined;
  transactionId?: string;
  successUrl?: string;
}): Promise<boolean> {
  const { config, transactionId, successUrl } = options;
  if (!config || !transactionId) return false;
  const paddle = await getPaddle(config);
  if (!paddle) return false;

  paddle.Checkout.open({
    transactionId,
    settings: successUrl ? { successUrl } : undefined,
  });
  return true;
}

export function usePaddleConfig() {
  return useQuery({
    queryKey: ['paddleConfig'],
    queryFn: async () => (await api.get('/billing/config')).data as PaddlePublicConfig,
    staleTime: Infinity,
  });
}
