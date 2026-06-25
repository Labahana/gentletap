import { initializePaddle, type Paddle } from "@paddle/paddle-js";

export type PaddlePublicConfig = {
  client_token: string;
  environment: "sandbox" | "production";
};

let paddlePromise: Promise<Paddle | undefined> | null = null;
let cacheKey = "";

/**
 * Lazily load and initialize Paddle.js with the publishable client token returned
 * by the backend. Cached per token+environment so the script loads once.
 */
export async function getPaddle(config: PaddlePublicConfig): Promise<Paddle | undefined> {
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
 * when the overlay was opened, false when Paddle.js is unavailable (caller should
 * fall back to the hosted checkout URL).
 */
export async function openOverlayCheckout(options: {
  config: PaddlePublicConfig;
  transactionId: string;
  onComplete?: () => void;
}): Promise<boolean> {
  const { config, transactionId, onComplete } = options;
  if (!transactionId) return false;
  const paddle = await getPaddle(config);
  if (!paddle) return false;

  if (onComplete) {
    paddle.Update({
      eventCallback: (event) => {
        if (event.name === "checkout.completed") onComplete();
      },
    });
  }

  paddle.Checkout.open({ transactionId });
  return true;
}
