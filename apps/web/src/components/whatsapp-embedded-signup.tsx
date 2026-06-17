"use client";

import { useCallback, useEffect, useRef } from "react";
import { api, getToken } from "@/lib/api";

type EmbeddedConfig = {
  configured: boolean;
  app_id: string | null;
  config_id: string | null;
  solution_id: string | null;
  sdk_version: string;
  feature_type: string;
  requires_meta_validation?: boolean;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (response: unknown) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type Props = {
  config: EmbeddedConfig;
  phoneE164: string;
  disabled?: boolean;
  onComplete: () => void;
  onError: (message: string) => void;
};

export function WhatsappEmbeddedSignup({
  config,
  phoneE164,
  disabled,
  onComplete,
  onError,
}: Props) {
  const sdkReady = useRef(false);
  const listenerAttached = useRef(false);
  const metaCodeRef = useRef<string | undefined>(undefined);
  const pendingFinishRef = useRef<{ wabaId: string; phoneNumberId?: string } | null>(null);

  const completeSignup = useCallback(
    async (wabaId: string, metaPhoneNumberId?: string, metaCode?: string) => {
      const token = getToken();
      if (!token) return;
      try {
        await api.whatsappEmbeddedSignupComplete(token, {
          waba_id: wabaId,
          phone_e164: phoneE164.trim(),
          meta_phone_number_id: metaPhoneNumberId,
          meta_code: metaCode,
        });
        pendingFinishRef.current = null;
        onComplete();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Registration failed");
      }
    },
    [phoneE164, onComplete, onError],
  );

  const tryCompleteSignup = useCallback(() => {
    const pending = pendingFinishRef.current;
    if (!pending) return;
    void completeSignup(pending.wabaId, pending.phoneNumberId, metaCodeRef.current);
  }, [completeSignup]);

  useEffect(() => {
    if (!config.configured || !config.app_id || sdkReady.current) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: config.app_id,
        autoLogAppEvents: true,
        xfbml: true,
        version: config.sdk_version || "v21.0",
      });
      sdkReady.current = true;
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(script);
    } else if (window.FB) {
      sdkReady.current = true;
    }
  }, [config]);

  useEffect(() => {
    if (!config.configured || listenerAttached.current) return;

    const handler = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA") {
          const wabaId = data.data?.waba_id as string | undefined;
          const phoneNumberId = data.data?.phone_number_id as string | undefined;
          if (wabaId) {
            pendingFinishRef.current = { wabaId, phoneNumberId };
            if (!config.requires_meta_validation) {
              tryCompleteSignup();
            }
          }
        } else if (data.event === "ERROR") {
          onError(data.data?.error_message || "Embedded Signup error");
        }
      } catch {
        // ignore non-JSON postMessage
      }
    };

    window.addEventListener("message", handler);
    listenerAttached.current = true;
    return () => window.removeEventListener("message", handler);
  }, [config.configured, config.requires_meta_validation, tryCompleteSignup, onError]);

  function launchSignup() {
    if (!phoneE164.trim().startsWith("+")) {
      onError("Enter your business phone in E.164 format first (e.g. +15551234567)");
      return;
    }
    if (!window.FB || !config.config_id || !config.solution_id) {
      onError("Facebook SDK not ready — try again in a moment");
      return;
    }

    const extras: Record<string, unknown> = {
      sessionInfoVersion: 3,
      setup: { solutionID: config.solution_id },
    };
    if (config.feature_type) {
      extras.featureType = config.feature_type;
    }

    window.FB.login(
      (response: { authResponse?: { code?: string } }) => {
        metaCodeRef.current = response.authResponse?.code;
        tryCompleteSignup();
      },
      {
        config_id: config.config_id,
        auth_type: "rerequest",
        response_type: "code",
        override_default_response_type: true,
        extras,
      },
    );
  }

  if (!config.configured) return null;

  return (
    <button
      type="button"
      className="btn-primary w-full text-sm"
      style={{ backgroundColor: "#1877F2" }}
      onClick={launchSignup}
      disabled={disabled || !phoneE164.trim()}
    >
      Login with Facebook to connect WhatsApp
    </button>
  );
}
