import type { ProductSearchResult } from "../types";

const LAST_FEED_KEY = "bfm_lazada_feed_last";
const SCROLL_KEY = "bfm_link_search_scroll";
const LAST_FEED_TTL_MS = 24 * 60 * 60_000; // 24 hours

export interface LazadaFeedLastSession {
  version: 1;
  query: string;
  page: number;
  hasMore: boolean;
  results: ProductSearchResult[];
  savedAt: number;
}

export interface LinkSearchScrollState {
  y: number;
  productUrl?: string;
}

/** Survives React Strict Mode double-mount in dev. */
let memoryScroll: LinkSearchScrollState | null = null;

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

export function loadLastLazadaFeedSession(): LazadaFeedLastSession | null {
  const data = readJson<LazadaFeedLastSession>(LAST_FEED_KEY);
  if (data?.version !== 1 || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }
  if (Date.now() - data.savedAt > LAST_FEED_TTL_MS) {
    localStorage.removeItem(LAST_FEED_KEY);
    return null;
  }
  return {
    ...data,
    query: typeof data.query === "string" ? data.query : "",
    page: Number.isFinite(data.page) && data.page > 0 ? data.page : 1,
    hasMore: Boolean(data.hasMore),
  };
}

export function saveLastLazadaFeedSession(
  query: string,
  page: number,
  hasMore: boolean,
  results: ProductSearchResult[],
): void {
  if (!Array.isArray(results) || results.length === 0) return;

  writeJson(LAST_FEED_KEY, {
    version: 1,
    query: query.trim(),
    page: page > 0 ? page : 1,
    hasMore: Boolean(hasMore),
    results,
    savedAt: Date.now(),
  } satisfies LazadaFeedLastSession);
}

export function clearLastLazadaFeedSession(): void {
  try {
    localStorage.removeItem(LAST_FEED_KEY);
  } catch {
    /* ignore */
  }
  clearLinkSearchScroll();
}

/** Save home-page scroll before navigating to product detail. */
export function saveLinkSearchScroll(
  y = typeof window !== "undefined" ? window.scrollY : 0,
  productUrl?: string,
): void {
  const state: LinkSearchScrollState = {
    y: Math.max(0, Math.round(y)),
    productUrl: productUrl?.trim() || undefined,
  };
  memoryScroll = state;
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Read saved scroll without clearing (safe with React Strict Mode). */
export function loadLinkSearchScroll(): LinkSearchScrollState | null {
  if (memoryScroll) return memoryScroll;
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LinkSearchScrollState | number;
    // Back-compat: older builds stored a bare number
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
      return { y: parsed };
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as LinkSearchScrollState).y === "number"
    ) {
      return parsed as LinkSearchScrollState;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLinkSearchScroll(): void {
  memoryScroll = null;
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated use loadLinkSearchScroll + clearLinkSearchScroll */
export function takeLinkSearchScroll(): number | null {
  const state = loadLinkSearchScroll();
  clearLinkSearchScroll();
  return state?.y ?? null;
}
