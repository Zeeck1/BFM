import type { ProductSearchResult } from "../types";

interface LazadaSearchResponse {
  results?: ProductSearchResult[];
  page?: number;
  has_more?: boolean;
  error?: string;
}

export interface LazadaSearchPage {
  results: ProductSearchResult[];
  page: number;
  hasMore: boolean;
}

export async function searchLazadaProducts(
  query: string,
  page = 1,
): Promise<LazadaSearchPage> {
  const res = await fetch("/api/lazada-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, page }),
    signal: AbortSignal.timeout(25_000),
  });

  const data = (await res.json().catch(() => ({}))) as LazadaSearchResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to search Lazada products");
  }

  return {
    results: data.results ?? [],
    page: data.page ?? page,
    hasMore: Boolean(data.has_more),
  };
}
