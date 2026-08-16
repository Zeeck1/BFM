import { fetchApi } from "./apiClient";
import { supabase } from "./supabase";

export interface LazadaCatalogStats {
  product_count: number;
  last_sync: {
    status: string;
    products_upserted: number;
    pages_fetched: number;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
  } | null;
}

export interface LazadaFeedSyncResult {
  ok: boolean;
  status: "success" | "failed";
  pages_fetched: number;
  products_upserted: number;
  error_message?: string;
  run_id?: string;
}

async function adminAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchLazadaCatalogStats(): Promise<LazadaCatalogStats> {
  const headers = await adminAuthHeaders();
  const res = await fetchApi("/api/lazada-catalog-stats", { headers, retries: 3 });
  const data = (await res.json().catch(() => ({}))) as LazadaCatalogStats & {
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Could not load catalog stats");
  return data;
}

export async function syncLazadaCatalog(options?: {
  maxPages?: number;
}): Promise<LazadaFeedSyncResult> {
  const headers = await adminAuthHeaders();
  const res = await fetchApi("/api/lazada-feed-sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ offerType: 1, maxPages: options?.maxPages }),
    timeoutMs: 10 * 60_000,
    retries: 0,
  });
  const data = (await res.json().catch(() => ({}))) as LazadaFeedSyncResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || data.error_message || "Catalog sync failed");
  }
  return data;
}
