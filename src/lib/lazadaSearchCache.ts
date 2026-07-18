import type { ProductSearchResult } from "../types";
import type { LazadaSearchPage } from "./lazadaSearch";

const LAST_SEARCH_KEY = "bfm_lazada_last_search";
const PAGE_CACHE_KEY = "bfm_lazada_search_pages";
const LAST_SEARCH_TTL_MS = 24 * 60 * 60_000; // 24 hours
const PAGE_CACHE_TTL_MS = 30 * 60_000; // 30 minutes

export interface LazadaLastSearch {
  version: 3;
  query: string;
  page: number;
  hasMore: boolean;
  results: ProductSearchResult[];
  savedAt: number;
}

interface PageCacheEntry {
  expiresAt: number;
  value: LazadaSearchPage;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadLastLazadaSearch(): LazadaLastSearch | null {
  const data = readJson<LazadaLastSearch>(LAST_SEARCH_KEY);
  if (data?.version !== 3 || !data.query || !Array.isArray(data.results)) return null;
  if (Date.now() - data.savedAt > LAST_SEARCH_TTL_MS) {
    localStorage.removeItem(LAST_SEARCH_KEY);
    return null;
  }
  return data;
}

export function saveLastLazadaSearch(
  query: string,
  page: LazadaSearchPage,
): void {
  const cleaned = query.trim();
  if (!cleaned || page.results.length === 0) return;

  writeJson(LAST_SEARCH_KEY, {
    version: 3,
    query: cleaned,
    page: page.page,
    hasMore: page.hasMore,
    results: page.results,
    savedAt: Date.now(),
  } satisfies LazadaLastSearch);

  savePageCache(cleaned, page);
}

function pageCacheKey(query: string, page: number): string {
  return `${query.trim().toLowerCase()}::${page}::15::details-v3`;
}

export function loadPageCache(query: string, page: number): LazadaSearchPage | null {
  const map = readJson<Record<string, PageCacheEntry>>(PAGE_CACHE_KEY) ?? {};
  const entry = map[pageCacheKey(query, page)];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.value;
}

export function savePageCache(query: string, page: LazadaSearchPage): void {
  const map = readJson<Record<string, PageCacheEntry>>(PAGE_CACHE_KEY) ?? {};
  map[pageCacheKey(query, page.page)] = {
    expiresAt: Date.now() + PAGE_CACHE_TTL_MS,
    value: page,
  };

  // Keep only the newest ~40 entries
  const entries = Object.entries(map).sort(
    (a, b) => b[1].expiresAt - a[1].expiresAt,
  );
  writeJson(PAGE_CACHE_KEY, Object.fromEntries(entries.slice(0, 40)));
}

export function clearLastLazadaSearch(): void {
  try {
    localStorage.removeItem(LAST_SEARCH_KEY);
  } catch {
    /* ignore */
  }
}
