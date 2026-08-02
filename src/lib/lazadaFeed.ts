import type { ProductSearchResult } from "../types";
import { BFM_ERRORS, toBfmUserError } from "./bfmMessages";

interface LazadaFeedResponse {
  results?: ProductSearchResult[];
  page?: number;
  has_more?: boolean;
  query?: string;
  matched?: boolean;
  match_count?: number;
  feed_total?: number;
  sample_brands?: string[];
  error?: string;
}

/** Products per results page — high enough to show most feed matches at once. */
export const LAZADA_FEED_PAGE_SIZE = 30;

export interface LazadaFeedPage {
  results: ProductSearchResult[];
  page: number;
  hasMore: boolean;
  query: string;
  /** True when results matched productName/brandName from feed JSON. */
  matched: boolean;
  matchCount: number;
  feedTotal: number;
  sampleBrands: string[];
}

/** Load Lazada Affiliate `/marketing/product/feed` JSON and return product cards. */
export async function fetchLazadaFeed(
  page = 1,
  options?: { query?: string },
): Promise<LazadaFeedPage> {
  const query = options?.query?.trim() ?? "";
  let res: Response;
  try {
    // First keyword filter may load the full feed JSON; later pages use server cache.
    res = await fetch("/api/lazada-feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        page,
        limit: LAZADA_FEED_PAGE_SIZE,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error(BFM_ERRORS.feedUnavailable);
  }

  const data = (await res.json().catch(() => ({}))) as LazadaFeedResponse;

  if (!res.ok) {
    throw new Error(toBfmUserError(data.error, BFM_ERRORS.feedUnavailable));
  }

  return {
    results: (data.results ?? []).slice(0, LAZADA_FEED_PAGE_SIZE),
    page: data.page ?? page,
    hasMore: Boolean(data.has_more),
    query: data.query ?? query,
    matched: Boolean(data.matched),
    matchCount: typeof data.match_count === "number" ? data.match_count : 0,
    feedTotal: typeof data.feed_total === "number" ? data.feed_total : 0,
    sampleBrands: Array.isArray(data.sample_brands)
      ? data.sample_brands.filter((b): b is string => typeof b === "string")
      : [],
  };
}
