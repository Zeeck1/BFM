import type { ProductSearchResult } from "../types";

const LAST_FEED_KEY = "bfm_lazada_feed_last";
const LAST_FEED_TTL_MS = 24 * 60 * 60_000; // 24 hours

/** Survives in-app navigation even if localStorage write is quota-blocked. */
let memoryFeedSession: LazadaFeedLastSession | null = null;

export type LinkSearchMode = "affiliate" | "smart";

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
  mode?: LinkSearchMode;
}

/** Survives React Strict Mode double-mount in dev — keyed by search mode. */
const memoryScrollByMode: Record<LinkSearchMode, LinkSearchScrollState | null> = {
  affiliate: null,
  smart: null,
};

function scrollStorageKey(mode: LinkSearchMode): string {
  return `bfm_link_search_scroll_${mode}`;
}

function slimResults(results: ProductSearchResult[]): ProductSearchResult[] {
  return results.map((result) => ({
    url: result.url,
    title: result.title,
    image_url: result.image_url,
    price_thb: result.price_thb,
    original_price_thb: result.original_price_thb,
    site_name: result.site_name,
    shop_name: result.shop_name,
    source_id: result.source_id,
    sold_count: result.sold_count,
  }));
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    sessionStorage.setItem(key, raw);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* ignore quota / private mode */
  }
}

function isFreshSession(data: LazadaFeedLastSession | null): data is LazadaFeedLastSession {
  if (!data || data.version !== 1 || !Array.isArray(data.results) || data.results.length === 0) {
    return false;
  }
  if (Date.now() - data.savedAt > LAST_FEED_TTL_MS) return false;
  return true;
}

export function loadLastLazadaFeedSession(): LazadaFeedLastSession | null {
  if (isFreshSession(memoryFeedSession)) {
    return {
      ...memoryFeedSession,
      query: typeof memoryFeedSession.query === "string" ? memoryFeedSession.query : "",
      page:
        Number.isFinite(memoryFeedSession.page) && memoryFeedSession.page > 0
          ? memoryFeedSession.page
          : 1,
      hasMore: Boolean(memoryFeedSession.hasMore),
    };
  }

  const data = readJson<LazadaFeedLastSession>(LAST_FEED_KEY);
  if (!isFreshSession(data)) {
    memoryFeedSession = null;
    try {
      localStorage.removeItem(LAST_FEED_KEY);
      sessionStorage.removeItem(LAST_FEED_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  memoryFeedSession = data;
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

  const session: LazadaFeedLastSession = {
    version: 1,
    query: query.trim(),
    page: page > 0 ? page : 1,
    hasMore: Boolean(hasMore),
    results: slimResults(results),
    savedAt: Date.now(),
  };
  memoryFeedSession = session;
  writeJson(LAST_FEED_KEY, session);
}

export function clearLastLazadaFeedSession(): void {
  memoryFeedSession = null;
  try {
    localStorage.removeItem(LAST_FEED_KEY);
    sessionStorage.removeItem(LAST_FEED_KEY);
  } catch {
    /* ignore */
  }
  clearLinkSearchScroll("affiliate");
}

/** Save Add Link scroll before navigating to product detail (mode-scoped). */
export function saveLinkSearchScroll(
  y = typeof window !== "undefined" ? window.scrollY : 0,
  productUrl?: string,
  mode: LinkSearchMode = "affiliate",
): void {
  const state: LinkSearchScrollState = {
    y: Math.max(0, Math.round(y)),
    productUrl: productUrl?.trim() || undefined,
    mode,
  };
  memoryScrollByMode[mode] = state;
  try {
    sessionStorage.setItem(scrollStorageKey(mode), JSON.stringify(state));
    // Migrate away from legacy shared key
    sessionStorage.removeItem("bfm_link_search_scroll");
  } catch {
    /* ignore */
  }
}

/** Read saved scroll for one search mode without clearing. */
export function loadLinkSearchScroll(mode: LinkSearchMode): LinkSearchScrollState | null {
  if (memoryScrollByMode[mode]) return memoryScrollByMode[mode];
  try {
    const raw = sessionStorage.getItem(scrollStorageKey(mode));
    if (!raw) {
      // Back-compat: legacy shared key only applies when reading affiliate
      if (mode === "affiliate") {
        const legacy = sessionStorage.getItem("bfm_link_search_scroll");
        if (legacy) {
          const parsed = JSON.parse(legacy) as LinkSearchScrollState | number;
          if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
            return { y: parsed, mode: "affiliate" };
          }
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof (parsed as LinkSearchScrollState).y === "number"
          ) {
            return { ...(parsed as LinkSearchScrollState), mode: "affiliate" };
          }
        }
      }
      return null;
    }
    const parsed = JSON.parse(raw) as LinkSearchScrollState | number;
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
      return { y: parsed, mode };
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as LinkSearchScrollState).y === "number"
    ) {
      return { ...(parsed as LinkSearchScrollState), mode };
    }
    return null;
  } catch {
    return null;
  }
}

/** Clear scroll for one mode, or both when omitted. */
export function clearLinkSearchScroll(mode?: LinkSearchMode): void {
  const modes: LinkSearchMode[] = mode ? [mode] : ["affiliate", "smart"];
  for (const m of modes) {
    memoryScrollByMode[m] = null;
    try {
      sessionStorage.removeItem(scrollStorageKey(m));
    } catch {
      /* ignore */
    }
  }
  if (!mode) {
    try {
      sessionStorage.removeItem("bfm_link_search_scroll");
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated use loadLinkSearchScroll + clearLinkSearchScroll */
export function takeLinkSearchScroll(): number | null {
  const state = loadLinkSearchScroll("affiliate");
  clearLinkSearchScroll("affiliate");
  return state?.y ?? null;
}
