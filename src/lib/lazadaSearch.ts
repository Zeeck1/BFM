import type { ProductSearchResult } from "../types";
import { loadPageCache, saveLastLazadaSearch } from "./lazadaSearchCache";

interface LazadaSearchResponse {
  results?: ProductSearchResult[];
  page?: number;
  has_more?: boolean;
  error?: string;
}

export const LAZADA_SEARCH_PAGE_SIZE = 15;

export interface LazadaSearchPage {
  results: ProductSearchResult[];
  page: number;
  hasMore: boolean;
}

export async function searchLazadaProducts(
  query: string,
  page = 1,
  options?: { bypassCache?: boolean },
): Promise<LazadaSearchPage> {
  const cleaned = query.trim();

  if (!options?.bypassCache) {
    const cached = loadPageCache(cleaned, page);
    if (cached && cached.results.length > 0) {
      const normalized = {
        ...cached,
        results: cached.results.slice(0, LAZADA_SEARCH_PAGE_SIZE),
      };
      saveLastLazadaSearch(cleaned, normalized);
      return normalized;
    }
  }

  const res = await fetch("/api/lazada-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: cleaned, page, pageSize: LAZADA_SEARCH_PAGE_SIZE }),
    signal: AbortSignal.timeout(25_000),
  });

  const data = (await res.json().catch(() => ({}))) as LazadaSearchResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to search Lazada products");
  }

  const result: LazadaSearchPage = {
    results: (data.results ?? []).slice(0, LAZADA_SEARCH_PAGE_SIZE),
    page: data.page ?? page,
    hasMore: Boolean(data.has_more),
  };

  if (result.results.length > 0) {
    saveLastLazadaSearch(cleaned, result);
  }

  return result;
}
