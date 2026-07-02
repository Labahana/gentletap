/** Server-side calls from Next route handlers to the FastAPI backend. */

export function getBackendUrl(): string {
  const configured = process.env.API_PROXY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "http://api:8000";
  return "http://localhost:8000";
}

export async function backendJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string }> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getBackendUrl()}/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail =
      typeof err.detail === "string"
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail.map((d: { msg?: string }) => d.msg).join(", ")
          : "Request failed";
    return { ok: false, status: res.status, detail };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}
