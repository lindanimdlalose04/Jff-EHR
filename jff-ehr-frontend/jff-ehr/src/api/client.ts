import axios from "axios";
import { supabase } from "@/lib/supabase";

/**
 * Shared Axios instance.
 *
 * - Attaches the Supabase JWT from wherever the auth context stores it.
 * - Surfaces a typed OfflineError when the browser is offline, so the
 *   best-effort-online strategy (yellow banner, writes disabled) can react
 *   without every caller re-checking navigator.onLine.
 */

export class OfflineError extends Error {
  constructor() {
    super("You are offline. This change was not saved.");
    this.name = "OfflineError";
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

// The Supabase session is the single source of the JWT; supabase-js keeps it
// persisted and refreshed, so every request picks up a currently valid token.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// Read-only resilience: retry failed GETs (network errors / 5xx, which on
// this stack are usually transient Supabase pooler timeouts) up to twice with
// backoff. Writes are never retried.
interface RetriableConfig {
  __retryCount?: number;
}

apiClient.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as (typeof error.config & RetriableConfig) | undefined;
  const isGet = (config?.method ?? "").toLowerCase() === "get";
  const status: number | undefined = error?.response?.status;
  const transient = status === undefined || status >= 500;
  if (!config || !isGet || !transient) throw error;

  config.__retryCount = (config.__retryCount ?? 0) + 1;
  if (config.__retryCount > 2) throw error;
  await new Promise((resolve) => setTimeout(resolve, 1500 * config.__retryCount));
  return apiClient(config);
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Block writes while offline; reads may still hit the cache layer.
    const method = (config.method ?? "get").toLowerCase();
    if (method !== "get") {
      return Promise.reject(new OfflineError());
    }
  }
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
