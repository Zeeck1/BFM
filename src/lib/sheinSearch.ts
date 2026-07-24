import type { ProductSearchResult } from "../types";
import {
  loadSheinPageCache,
  saveLastSheinSearch,
} from "./sheinSearchCache";

interface SheinSearchResponse {
  results?: ProductSearchResult[];
  page?: number;
  has_more?: boolean;
  error?: string;
}

export const SHEIN_SEARCH_PAGE_SIZE = 15;

export interface SheinSearchPage {
  results: ProductSearchResult[];
  page: number;
  hasMore: boolean;
}

export async function searchSheinProducts(
  query: string,
  page = 1,
  options?: { bypassCache?: boolean },
): Promise<SheinSearchPage> {
  const cleaned = query.trim();

  if (!options?.bypassCache) {
    const cached = loadSheinPageCache(cleaned, page);
    if (cached && cached.results.length > 0) {
      const normalized = {
        ...cached,
        results: cached.results.slice(0, SHEIN_SEARCH_PAGE_SIZE),
      };
      saveLastSheinSearch(cleaned, normalized);
      return normalized;
    }
  }

  const res = await fetch("/api/shein-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: cleaned, page, pageSize: SHEIN_SEARCH_PAGE_SIZE }),
    // SHEIN RapidAPI is slow (often 20–50s); keep above the server timeout + retry budget.
    signal: AbortSignal.timeout(130_000),
  });

  const data = (await res.json().catch(() => ({}))) as SheinSearchResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to search SHEIN products");
  }

  const result: SheinSearchPage = {
    results: (data.results ?? []).slice(0, SHEIN_SEARCH_PAGE_SIZE),
    page: data.page ?? page,
    hasMore: Boolean(data.has_more),
  };

  if (result.results.length > 0) {
    saveLastSheinSearch(cleaned, result);
  }

  return result;
}
