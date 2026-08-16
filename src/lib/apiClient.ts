/** Production API origin (Render). Empty in local dev so Vite's /api proxy is used. */
export const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN as string | undefined
)?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export interface FetchApiOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

/**
 * Fetch BFM API with cold-start retries.
 * Render free instances sleep; Netlify's proxy also times out (~26s).
 * Production calls Render directly so the browser can wait out the wake.
 */
export async function fetchApi(
  path: string,
  options: FetchApiOptions = {},
): Promise<Response> {
  const { timeoutMs = 45_000, retries = 4, signal, ...init } = options;
  const url = path.startsWith("http") ? path : apiUrl(path);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: init.cache ?? "no-store",
      });
      if (res.ok || !shouldRetryStatus(res.status) || attempt === retries) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (attempt === retries) throw err;
    } finally {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    await sleep(Math.min(2_000 * 2 ** attempt, 10_000));
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

/** Ping the API as soon as the site opens so Render wakes before product requests. */
export function wakeApi(): void {
  void fetchApi("/api/health", { timeoutMs: 90_000, retries: 5 }).catch(() => {});

  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void fetchApi("/api/health", { timeoutMs: 20_000, retries: 1 }).catch(() => {});
  }, 8 * 60_000);
}
