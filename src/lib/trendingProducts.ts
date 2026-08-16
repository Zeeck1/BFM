import type { ProductSearchResult } from "../types";
import { BFM_ERRORS, toBfmUserError } from "./bfmMessages";
import { fetchApi } from "./apiClient";
import { fetchLazadaFeedCatalog } from "./lazadaFeedCatalog";

interface TrendingResponse {
  results?: ProductSearchResult[];
  error?: string;
}

export const TRENDING_PRODUCTS_LIMIT = 6;

async function fetchPopularCatalogFallback(
  limit: number,
): Promise<ProductSearchResult[]> {
  const catalog = await fetchLazadaFeedCatalog({
    page: 1,
    limit,
    sort: "popular",
  });
  return catalog.products.slice(0, limit).map((product) => ({
    url: product.product_page_url || product.product_url,
    title: product.title || undefined,
    image_url: product.image_url ?? undefined,
    price_thb: product.price_thb ?? undefined,
    original_price_thb:
      product.original_price_thb != null &&
      product.price_thb != null &&
      product.original_price_thb > product.price_thb
        ? product.original_price_thb
        : undefined,
    site_name: "Lazada",
    shop_name: product.shop_name ?? product.brand_name ?? undefined,
    source_id: product.product_id || undefined,
    sold_count: product.sold_count ?? undefined,
  }));
}

/** Most-searched products for the home page (server aggregates search_events). */
export async function fetchTrendingProducts(
  limit = TRENDING_PRODUCTS_LIMIT,
  signal?: AbortSignal,
): Promise<ProductSearchResult[]> {
  try {
    const res = await fetchApi(`/api/trending-products?limit=${limit}`, {
      method: "GET",
      timeoutMs: 45_000,
      retries: 4,
      signal,
    });

    const data = (await res.json().catch(() => ({}))) as TrendingResponse;
    if (res.ok) {
      const results = (data.results ?? []).slice(0, limit);
      if (results.length > 0) return results;
    } else if (!signal?.aborted) {
      console.warn("[BFM] trending-products:", toBfmUserError(data.error, BFM_ERRORS.feedUnavailable));
    }
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  // Cold start / empty trending: still show most-sold catalog products.
  return fetchPopularCatalogFallback(limit);
}
