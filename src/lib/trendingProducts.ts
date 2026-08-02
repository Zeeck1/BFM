import type { ProductSearchResult } from "../types";
import { BFM_ERRORS, toBfmUserError } from "./bfmMessages";

interface TrendingResponse {
  results?: ProductSearchResult[];
  error?: string;
}

export const TRENDING_PRODUCTS_LIMIT = 6;

/** Most-searched products for the home page (server aggregates search_events). */
export async function fetchTrendingProducts(
  limit = TRENDING_PRODUCTS_LIMIT,
): Promise<ProductSearchResult[]> {
  let res: Response;
  try {
    res = await fetch(`/api/trending-products?limit=${limit}`, {
      method: "GET",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(BFM_ERRORS.feedUnavailable);
  }

  const data = (await res.json().catch(() => ({}))) as TrendingResponse;
  if (!res.ok) {
    throw new Error(toBfmUserError(data.error, BFM_ERRORS.feedUnavailable));
  }

  return (data.results ?? []).slice(0, limit);
}
